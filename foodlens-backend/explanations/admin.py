"""
Explanations app — Django Admin registration.
"""
from django.contrib import admin
from .models import Explanation, ExplanationFeedback


class ExplanationFeedbackInline(admin.TabularInline):
    """Inline display of feedback on the Explanation detail page."""
    model = ExplanationFeedback
    extra = 0
    readonly_fields = ('user', 'is_helpful', 'submitted_at')


@admin.register(Explanation)
class ExplanationAdmin(admin.ModelAdmin):
    list_display = ('id', 'scored_result', 'llm_model_used', 'generated_at', 'short_text')
    list_filter = ('llm_model_used', 'generated_at')
    search_fields = ('explanation_text',)
    readonly_fields = ('scored_result', 'explanation_text', 'llm_model_used', 'generated_at')
    inlines = [ExplanationFeedbackInline]

    def short_text(self, obj):
        """First 80 characters of the explanation for list display."""
        return obj.explanation_text[:80] + '...' if len(obj.explanation_text) > 80 else obj.explanation_text
    short_text.short_description = 'Explanation Preview'


@admin.register(ExplanationFeedback)
class ExplanationFeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'explanation', 'user', 'is_helpful', 'submitted_at')
    list_filter = ('is_helpful', 'submitted_at')
    readonly_fields = ('explanation', 'user', 'is_helpful', 'submitted_at')
