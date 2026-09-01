"""
Explanations app — Serializers for Explanation and ExplanationFeedback.
"""
from rest_framework import serializers
from .models import Explanation, ExplanationFeedback


class ExplanationSerializer(serializers.ModelSerializer):
    """Serializer for the Explanation model — read-only output."""

    class Meta:
        model = Explanation
        fields = [
            'id',
            'scored_result_id',
            'explanation_text',
            'llm_model_used',
            'generated_at',
        ]
        read_only_fields = fields


class ExplanationFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for ExplanationFeedback — accepts is_helpful only."""

    class Meta:
        model = ExplanationFeedback
        fields = [
            'id',
            'explanation_id',
            'is_helpful',
            'submitted_at',
        ]
        read_only_fields = ['id', 'explanation_id', 'submitted_at']
