"""
Health app — Admin registration.
"""
from django.contrib import admin

from .models import HealthProfile, HealthCondition, Allergy


class HealthConditionInline(admin.TabularInline):
    model = HealthCondition
    extra = 1


class AllergyInline(admin.TabularInline):
    model = Allergy
    extra = 1


@admin.register(HealthProfile)
class HealthProfileAdmin(admin.ModelAdmin):
    list_display = ['profile_name', 'user', 'relation', 'age', 'gender', 'created_at']
    list_filter = ['relation', 'gender']
    search_fields = ['profile_name', 'user__username']
    inlines = [HealthConditionInline, AllergyInline]


@admin.register(HealthCondition)
class HealthConditionAdmin(admin.ModelAdmin):
    list_display = ['condition_name', 'profile']
    search_fields = ['condition_name']


@admin.register(Allergy)
class AllergyAdmin(admin.ModelAdmin):
    list_display = ['allergen_name', 'profile']
    search_fields = ['allergen_name']
