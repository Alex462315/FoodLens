from django.contrib import admin
from .models import HealthyAlternative


@admin.register(HealthyAlternative)
class HealthyAlternativeAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'category',
        'normalized_score',
        'risk_label',
        'brand',
        'allergens',
        'is_active',
        'created_at',
    ]
    list_filter = ['category', 'risk_label', 'is_active']
    search_fields = ['name', 'brand', 'why_better', 'allergens']
    list_editable = ['is_active', 'normalized_score']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'brand', 'category', 'image_url', 'is_active')
        }),
        ('Health & Safety Evaluation', {
            'fields': ('normalized_score', 'risk_label', 'why_better', 'allergens', 'avoid_for_conditions')
        }),
        ('Nutritional Information (per 100g)', {
            'fields': (
                ('energy_kcal', 'sugars'),
                ('proteins', 'fat'),
                ('saturated_fat', 'salt'),
                ('fiber', 'carbohydrates'),
            )
        }),
    )
