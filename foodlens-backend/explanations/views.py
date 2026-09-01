"""
Explanations app — Views for generating and providing feedback on explanations.

Two endpoints:
  POST /api/explanations/generate/       — Generate (or retrieve cached) explanation
  POST /api/explanations/{id}/feedback/  — Submit thumbs-up/down feedback
"""
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from scoring.models import ScoredResult
from .models import Explanation, ExplanationFeedback
from .serializers import ExplanationSerializer
from .llm_service import (
    generate_explanation,
    ExplanationError,
    APIKeyMissingError,
    GEMINI_MODEL,
)

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_explanation_view(request):
    """
    POST /api/explanations/generate/
    Body: { "scored_result_id": <id> }

    Behavior:
      - If an Explanation already exists for this scored_result_id,
        return it directly (HTTP 200) without calling the LLM again.
      - If not, call generate_explanation(), save the result, return it (HTTP 201).
      - The scored_result must belong to a scan owned by the requesting user.
        Returns 404 (not 403) on mismatch — consistent with existing auth pattern.
      - Returns 502 on LLM failure.

    Success 200 (cached):
        { "id": 1, "scored_result_id": 5, "explanation_text": "...", ... }

    Success 201 (freshly generated):
        { "id": 2, "scored_result_id": 6, "explanation_text": "...", ... }

    Error 400: { "detail": "scored_result_id is required." }
    Error 404: { "detail": "Scored result not found." }
    Error 502: { "detail": "Could not generate explanation. Please try again." }
    """
    scored_result_id = request.data.get('scored_result_id')

    if not scored_result_id:
        return Response(
            {'detail': 'The "scored_result_id" field is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate ownership: the scored_result's profile must belong to this user.
    # Return 404 (not 403) on mismatch — consistent with health-profile pattern.
    try:
        scored_result = ScoredResult.objects.select_related(
            'profile'
        ).get(id=scored_result_id)
    except ScoredResult.DoesNotExist:
        return Response(
            {'detail': 'Scored result not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if scored_result.profile.user_id != request.user.id:
        return Response(
            {'detail': 'Scored result not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check cache: does an Explanation already exist for this scored_result?
    try:
        existing = Explanation.objects.get(scored_result=scored_result)
        serializer = ExplanationSerializer(existing)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Explanation.DoesNotExist:
        pass  # Need to generate a new one

    # Generate fresh explanation via LLM
    try:
        explanation_text = generate_explanation(scored_result)
    except APIKeyMissingError as e:
        logger.error('Gemini API key not configured: %s', str(e))
        return Response(
            {'detail': 'AI explanation service is not configured. Please contact support.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except ExplanationError as e:
        logger.error(
            'Failed to generate explanation for ScoredResult #%d: %s',
            scored_result_id, str(e),
        )
        return Response(
            {'detail': 'Could not generate explanation. Please try again.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # Save to database (cache for future requests)
    explanation = Explanation.objects.create(
        scored_result=scored_result,
        explanation_text=explanation_text,
        llm_model_used=GEMINI_MODEL,
    )

    serializer = ExplanationSerializer(explanation)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_feedback_view(request, explanation_id):
    """
    POST /api/explanations/{id}/feedback/
    Body: { "is_helpful": true }

    Behavior:
      - Creates or updates the requesting user's feedback for this explanation.
      - The unique_together constraint ensures one vote per user per explanation.
      - A second call with a different is_helpful value UPDATES the existing row.
      - Rejects if the explanation doesn't belong to a scan owned by the user.

    Success 200: { "explanation_id": 1, "is_helpful": true }
    Error 400: { "detail": "is_helpful field is required." }
    Error 404: { "detail": "Explanation not found." }
    """
    # Validate is_helpful field
    is_helpful = request.data.get('is_helpful')
    if is_helpful is None:
        return Response(
            {'detail': 'The "is_helpful" field is required (true or false).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate explanation exists and belongs to this user
    try:
        explanation = Explanation.objects.select_related(
            'scored_result__profile'
        ).get(id=explanation_id)
    except Explanation.DoesNotExist:
        return Response(
            {'detail': 'Explanation not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if explanation.scored_result.profile.user_id != request.user.id:
        return Response(
            {'detail': 'Explanation not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Create or update feedback (upsert pattern)
    feedback, created = ExplanationFeedback.objects.update_or_create(
        explanation=explanation,
        user=request.user,
        defaults={'is_helpful': is_helpful},
    )

    return Response(
        {
            'explanation_id': explanation.id,
            'is_helpful': feedback.is_helpful,
        },
        status=status.HTTP_200_OK,
    )
