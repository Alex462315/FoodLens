"""
Explanations app — Models for AI-generated explanation caching and user feedback.

Two models:
  - Explanation: Cached LLM-generated plain-language explanation for a ScoredResult.
                 One explanation per scored result (unique FK enforces DB-level caching).
  - ExplanationFeedback: Per-user thumbs-up/down feedback on an explanation.
                         unique_together prevents duplicate votes.
"""
from django.conf import settings
from django.db import models

from scoring.models import ScoredResult


class Explanation(models.Model):
    """
    A cached, LLM-generated plain-language explanation of a ScoredResult.

    The LLM only phrases pre-verified scoring data — it never determines
    a risk score, allergen status, or any health claim itself.

    The unique constraint on scored_result enforces the one-explanation-per-scan
    caching rule at the database level: if an explanation already exists for a
    given ScoredResult, no second LLM call should be made.
    """
    scored_result = models.OneToOneField(
        ScoredResult,
        on_delete=models.CASCADE,
        related_name='explanation',
        help_text='The scored result this explanation describes (one-to-one)',
    )
    explanation_text = models.TextField(
        help_text='The LLM-generated plain-language explanation',
    )
    llm_model_used = models.CharField(
        max_length=100,
        help_text='LLM model identifier for auditability (e.g., "gemini-2.0-flash")',
    )
    generated_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Timestamp when this explanation was generated',
    )

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"Explanation for ScoredResult #{self.scored_result_id} ({self.llm_model_used})"


class ExplanationFeedback(models.Model):
    """
    User feedback (thumbs-up / thumbs-down) on an AI-generated explanation.

    unique_together ensures a user can only have one vote per explanation.
    Subsequent votes should UPDATE the existing row, not create a duplicate.
    """
    explanation = models.ForeignKey(
        Explanation,
        on_delete=models.CASCADE,
        related_name='feedback',
        help_text='The explanation this feedback is for',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='explanation_feedback',
        help_text='The user who submitted this feedback',
    )
    is_helpful = models.BooleanField(
        help_text='True = thumbs up, False = thumbs down',
    )
    submitted_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When this feedback was submitted',
    )

    class Meta:
        unique_together = ('explanation', 'user')
        ordering = ['-submitted_at']

    def __str__(self):
        vote = '👍' if self.is_helpful else '👎'
        return f"{vote} by user {self.user_id} on Explanation #{self.explanation_id}"
