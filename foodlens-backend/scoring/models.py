"""
Scoring app — Models for Ingredient Risk Database.

Three tables:
  - Ingredient: canonical ingredients with base risk scores (0–10)
  - IngredientAlias: alternate names/codes that map to an Ingredient
  - ConditionMultiplier: per-condition, per-category multiplier rules
    (severity is applied at calculation time, not stored here)
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Ingredient(models.Model):
    """
    A known ingredient with a base risk score.

    Risk score buckets:
      0–2  : natural / generally safe
      3–5  : caution — moderate concern in excess
      6–8  : regular-excess harm — well-documented health impacts
      9–10 : strong consensus of harm
    """
    CATEGORY_CHOICES = [
        ('sweetener', 'Sweetener'),
        ('preservative', 'Preservative'),
        ('fat', 'Fat / Oil'),
        ('flavor_enhancer', 'Flavor Enhancer'),
        ('sodium_containing', 'Sodium-Containing'),
        ('refined_carb', 'Refined Carbohydrate'),
        ('natural', 'Natural / Low-Risk'),
        ('emulsifier', 'Emulsifier'),
        ('colorant', 'Colorant'),
        ('other', 'Other'),
    ]

    name = models.CharField(
        max_length=200,
        unique=True,
        help_text='Canonical ingredient name (e.g., "Sodium Benzoate")',
    )
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='other',
        db_index=True,
    )
    base_risk_score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[
            MinValueValidator(0, message='Score must be at least 0.'),
            MaxValueValidator(10, message='Score must be at most 10.'),
        ],
        help_text='Base risk score from 0 (safe) to 10 (high risk)',
    )
    allergen_flag = models.BooleanField(
        default=False,
        help_text='True if this ingredient is a common allergen',
    )
    source_reference = models.TextField(
        blank=True,
        default='',
        help_text='Citation / source for the risk score assignment',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        flag = ' ⚠️' if self.allergen_flag else ''
        return f"{self.name} ({self.base_risk_score}/10){flag}"


class IngredientAlias(models.Model):
    """
    An alternate name or E-number that maps to a canonical Ingredient.
    e.g., "E211" → Sodium Benzoate, "Sucrose" → Sugar
    """
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name='aliases',
    )
    alias_name = models.CharField(
        max_length=200,
        unique=True,
        help_text='Alternate name or E-number',
    )

    class Meta:
        verbose_name_plural = 'Ingredient aliases'
        ordering = ['alias_name']

    def __str__(self):
        return f"{self.alias_name} → {self.ingredient.name}"


class ConditionMultiplier(models.Model):
    """
    A rule that says: for a given health condition + ingredient category,
    multiply the base_risk_score by multiplier_value.

    Severity weighting is applied at calculation time (see scoring engine),
    NOT stored here. This keeps the rule table simple and reusable.
    """
    condition_name = models.CharField(
        max_length=100,
        db_index=True,
        help_text='Health condition name, must match HealthCondition.condition_name',
    )
    ingredient_category = models.CharField(
        max_length=30,
        choices=Ingredient.CATEGORY_CHOICES,
        db_index=True,
        help_text='Ingredient category this rule applies to',
    )
    multiplier_value = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[
            MinValueValidator(0.1, message='Multiplier must be at least 0.1.'),
        ],
        help_text='Multiplier applied to base_risk_score (e.g., 1.5 = 50% increase)',
    )

    class Meta:
        unique_together = ('condition_name', 'ingredient_category')
        ordering = ['condition_name', 'ingredient_category']

    def __str__(self):
        return f"{self.condition_name} + {self.ingredient_category} x{self.multiplier_value}"


class ScoredResult(models.Model):
    """
    A persisted scoring result for a set of ingredients against a health profile.
    Stores the final normalized score plus metadata for retrieval.
    """
    profile = models.ForeignKey(
        'health.HealthProfile',
        on_delete=models.CASCADE,
        related_name='scored_results',
    )
    raw_score = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        help_text='Sum of all ingredient_impact values before normalization',
    )
    normalized_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text='Final score normalized to 0-100',
    )
    has_allergen_warning = models.BooleanField(
        default=False,
        help_text='True if any matched ingredient triggers an allergen warning',
    )
    allergen_details = models.JSONField(
        default=list,
        blank=True,
        help_text='List of allergen names that triggered warnings',
    )
    risk_label = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Human-readable risk label: Low / Moderate / High',
    )
    ingredients_text = models.TextField(
        blank=True,
        default='',
        help_text='Original raw ingredients text that was scored',
    )
    barcode = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text='Barcode of the scanned product (for history display)',
    )
    product_name = models.CharField(
        max_length=300,
        blank=True,
        default='',
        help_text='Product name at time of scan',
    )
    product_image_url = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text='Product image URL at time of scan',
    )
    nutrition_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Nutritional values per 100g at time of scan: energy_kcal, fat, sugars, proteins, salt, fiber, carbohydrates',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Score {self.normalized_score}/100 for profile {self.profile_id}"


class ScoredIngredientDetail(models.Model):
    """
    Per-ingredient breakdown within a ScoredResult.
    Stores every value used in the calculation for full explainability.
    """
    scored_result = models.ForeignKey(
        ScoredResult,
        on_delete=models.CASCADE,
        related_name='ingredient_details',
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    raw_token = models.CharField(
        max_length=200,
        help_text='Original token from the ingredients list',
    )
    position = models.PositiveIntegerField(
        help_text='1-indexed position in the ingredients list',
    )
    base_risk_score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0,
    )
    adjusted_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Score after condition multiplier + severity weighting',
    )
    position_weight = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        default=0,
        help_text='1 / position',
    )
    ingredient_impact = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        default=0,
        help_text='adjusted_score * position_weight',
    )
    is_allergen_trigger = models.BooleanField(
        default=False,
        help_text='True if this ingredient triggered an allergen warning',
    )

    class Meta:
        ordering = ['position']

    def __str__(self):
        return f"#{self.position} {self.raw_token} -> impact={self.ingredient_impact}"

