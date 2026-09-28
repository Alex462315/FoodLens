from django.db import models


CATEGORY_CHOICES = [
    ('chocolate_spread', 'Chocolate & Sweet Spreads'),
    ('soda_cola', 'Sodas & Carbonated Soft Drinks'),
    ('potato_chips', 'Fried Chips & Crisps'),
    ('instant_noodles', 'Instant Noodles & Ramen'),
    ('sweet_biscuits', 'Biscuits & Cookies'),
    ('fruit_juice_sweetened', 'Packaged Juices & Sugary Drinks'),
    ('default_clean', 'General Clean Whole Foods'),
]


class HealthyAlternative(models.Model):
    """
    Stores curated, lab-verified healthy food alternatives that can be recommended
    to users as lower-risk swaps for unhealthy packaged foods.
    Managed via Django Admin.
    """
    name = models.CharField(max_length=200, help_text='Product or whole food name (e.g. 100% Roasted Peanut Butter)')
    brand = models.CharField(max_length=100, default='Clean Whole Foods', blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='chocolate_spread')
    image_url = models.URLField(max_length=500, blank=True, null=True, help_text='Display image URL')
    normalized_score = models.FloatField(default=15.0, help_text='Health Risk Score (0-100, lower is better)')
    risk_label = models.CharField(max_length=20, default='Low', choices=[('Low', 'Low'), ('Moderate', 'Moderate')])
    why_better = models.TextField(help_text='Clinical or dietary explanation of why it is healthier')

    # Nutritional values (per 100g)
    energy_kcal = models.FloatField(default=0.0, verbose_name='Calories (kcal)')
    sugars = models.FloatField(default=0.0, verbose_name='Sugars (g)')
    proteins = models.FloatField(default=0.0, verbose_name='Proteins (g)')
    fat = models.FloatField(default=0.0, verbose_name='Fat (g)')
    saturated_fat = models.FloatField(default=0.0, verbose_name='Saturated Fat (g)')
    salt = models.FloatField(default=0.0, verbose_name='Salt (g)')
    fiber = models.FloatField(default=0.0, verbose_name='Fiber (g)')
    carbohydrates = models.FloatField(default=0.0, verbose_name='Carbohydrates (g)')

    # Allergens & Conditions tags (comma-separated, e.g. "peanuts, tree nuts")
    allergens = models.CharField(
        max_length=255,
        blank=True,
        help_text='Comma-separated allergens (e.g. peanuts, gluten, dairy, soy, tree nuts)',
    )
    avoid_for_conditions = models.CharField(
        max_length=255,
        blank=True,
        help_text='Comma-separated health conditions that should avoid this (e.g. Diabetes, Hypertension)',
    )

    is_active = models.BooleanField(default=True, help_text='Whether this alternative is active in recommendations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['normalized_score', 'name']
        verbose_name = 'Healthy Alternative Product'
        verbose_name_plural = 'Healthy Alternative Products'

    def __str__(self):
        return f"{self.name} ({self.get_category_display()} - {self.normalized_score:.0f}/100)"

    def get_allergens_list(self):
        if not self.allergens:
            return []
        return [a.strip().lower() for a in self.allergens.split(',') if a.strip()]

    def get_avoid_conditions_list(self):
        if not self.avoid_for_conditions:
            return []
        return [c.strip().lower() for c in self.avoid_for_conditions.split(',') if c.strip()]
