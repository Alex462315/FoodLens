"""
Health app — Models for Health Profile, Conditions, and Allergies.

A user can have multiple health profiles (e.g., "Myself", "Amma").
Each profile can have multiple conditions and allergies stored as
related rows in separate tables.
"""
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class HealthProfile(models.Model):
    """
    A health profile belonging to a user.
    One user can have many profiles (one-to-many).
    """
    RELATION_CHOICES = [
        ('self', 'Self'),
        ('parent', 'Parent'),
        ('child', 'Child'),
        ('other', 'Other'),
    ]

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='health_profiles',
    )
    profile_name = models.CharField(
        max_length=100,
        help_text='e.g., "Myself", "Amma"',
    )
    relation = models.CharField(
        max_length=10,
        choices=RELATION_CHOICES,
        default='self',
    )
    age = models.PositiveIntegerField(
        validators=[
            MinValueValidator(1, message='Age must be at least 1.'),
            MaxValueValidator(120, message='Age must be at most 120.'),
        ],
    )
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
    )
    height_cm = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.1, message='Height must be positive.')],
    )
    weight_kg = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.1, message='Weight must be positive.')],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.profile_name} ({self.user.username})"


class HealthCondition(models.Model):
    """
    A chronic health condition linked to a HealthProfile.
    e.g., "Diabetes", "Hypertension" with a severity rating.
    """
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
    ]

    profile = models.ForeignKey(
        HealthProfile,
        on_delete=models.CASCADE,
        related_name='conditions',
    )
    condition_name = models.CharField(max_length=100)
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default='moderate',
    )

    def __str__(self):
        return f"{self.condition_name} ({self.severity})"


class Allergy(models.Model):
    """
    An allergy linked to a HealthProfile.
    e.g., "Peanuts", "Gluten"
    """
    profile = models.ForeignKey(
        HealthProfile,
        on_delete=models.CASCADE,
        related_name='allergies',
    )
    allergen_name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = 'Allergies'

    def __str__(self):
        return self.allergen_name
