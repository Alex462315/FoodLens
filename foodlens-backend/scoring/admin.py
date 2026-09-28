"""
Scoring app — Django Admin configuration.

Provides admin interfaces for managing ingredients, aliases,
condition multipliers, and viewing scored results.
"""
from django.contrib import admin
from .models import (
    Ingredient, IngredientAlias, ConditionMultiplier,
    ScoredResult, ScoredIngredientDetail, CommunitySubmission,
)


class IngredientAliasInline(admin.TabularInline):
    """Inline editor for aliases on the Ingredient admin page."""
    model = IngredientAlias
    extra = 1
    fields = ('alias_name',)


class ScoredIngredientDetailInline(admin.TabularInline):
    """Inline viewer for ingredient details on the ScoredResult admin page."""
    model = ScoredIngredientDetail
    extra = 0
    readonly_fields = (
        'ingredient', 'raw_token', 'position', 'base_risk_score',
        'adjusted_score', 'position_weight', 'ingredient_impact',
        'is_allergen_trigger',
    )
    can_delete = False


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'category', 'base_risk_score', 'allergen_flag', 'created_at',
    )
    list_filter = ('category', 'allergen_flag')
    search_fields = ('name',)
    ordering = ('name',)
    inlines = [IngredientAliasInline]


@admin.register(IngredientAlias)
class IngredientAliasAdmin(admin.ModelAdmin):
    list_display = ('alias_name', 'ingredient')
    search_fields = ('alias_name', 'ingredient__name')
    ordering = ('alias_name',)


@admin.register(ConditionMultiplier)
class ConditionMultiplierAdmin(admin.ModelAdmin):
    list_display = (
        'condition_name', 'ingredient_category', 'multiplier_value',
    )
    list_filter = ('condition_name', 'ingredient_category')
    search_fields = ('condition_name',)
    ordering = ('condition_name', 'ingredient_category')


@admin.register(ScoredResult)
class ScoredResultAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'profile', 'normalized_score', 'risk_label',
        'has_allergen_warning', 'created_at',
    )
    list_filter = ('risk_label', 'has_allergen_warning')
    readonly_fields = (
        'profile', 'raw_score', 'normalized_score',
        'has_allergen_warning', 'allergen_details', 'risk_label',
        'ingredients_text', 'created_at',
    )
    inlines = [ScoredIngredientDetailInline]
    ordering = ('-created_at',)


from django.utils import timezone


@admin.register(CommunitySubmission)
class CommunitySubmissionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'product_name', 'brand', 'barcode', 'submitted_by',
        'status', 'created_at', 'reviewed_by', 'reviewed_at',
    )
    list_filter = ('status', 'created_at')
    search_fields = ('product_name', 'brand', 'barcode', 'submitted_by__username')
    readonly_fields = ('submitted_by', 'created_at', 'reviewed_at')
    ordering = ('-created_at',)
    actions = ['approve_submissions', 'reject_submissions']

    def save_model(self, request, obj, form, change):
        if obj.status in ('approved', 'rejected') and not obj.reviewed_at:
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)

    @admin.action(description="Approve selected submissions")
    def approve_submissions(self, request, queryset):
        count = queryset.update(
            status='approved',
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"{count} submission(s) approved and active in product lookup & risk scoring.")

    @admin.action(description="Reject selected submissions")
    def reject_submissions(self, request, queryset):
        count = queryset.update(
            status='rejected',
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"{count} submission(s) rejected.")
