"""
Health app — ViewSet for Health Profile CRUD + supported conditions/allergies endpoints.

All endpoints require Token authentication. Users can only access
their own profiles — attempting to access another user's profile
returns 404 (not 403) to avoid leaking that the ID exists.
"""
from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import HealthProfile
from .serializers import HealthProfileSerializer


class HealthProfileViewSet(viewsets.ModelViewSet):
    """
    Full CRUD ViewSet for HealthProfile.

    Endpoints (via DRF router):
        GET    /api/health-profiles/          — list logged-in user's profiles
        POST   /api/health-profiles/          — create a new profile
        GET    /api/health-profiles/{id}/     — retrieve one profile
        PUT    /api/health-profiles/{id}/     — full update
        PATCH  /api/health-profiles/{id}/     — partial update
        DELETE /api/health-profiles/{id}/     — delete
    """
    serializer_class = HealthProfileSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter to only return profiles belonging to the logged-in user.
        If a user tries to access another user's profile ID, they'll
        get a 404 (not 403) since that ID won't be in their queryset.
        """
        return HealthProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Auto-set the user to the logged-in user on create."""
        serializer.save(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supported_conditions_view(request):
    """
    GET /api/health-profiles/supported-conditions/

    Returns the list of supported health condition names — exactly as stored
    in the ConditionMultiplier table. The frontend MUST use this list to
    render a controlled picker so users cannot type arbitrary strings
    that would silently fail to match any scoring rule.

    Response:
        {
          "conditions": [
            {"name": "Diabetes", "description": "Type 1 or Type 2 Diabetes / insulin resistance"},
            {"name": "Hypertension", "description": "High blood pressure"},
            ...
          ]
        }
    """
    # These are exactly the condition_name values stored in the ConditionMultiplier table.
    # If you add new multipliers to the DB, add them here too.
    SUPPORTED_CONDITIONS = [
        {
            "name": "Diabetes",
            "description": "Type 1 or Type 2 Diabetes / insulin resistance",
            "icon": "🩸",
        },
        {
            "name": "Hypertension",
            "description": "High blood pressure",
            "icon": "❤️",
        },
        {
            "name": "Heart Disease",
            "description": "Coronary artery disease, heart failure, or related conditions",
            "icon": "🫀",
        },
        {
            "name": "Obesity",
            "description": "BMI ≥ 30, or doctor-diagnosed obesity",
            "icon": "⚖️",
        },
        {
            "name": "Kidney Disease",
            "description": "Chronic kidney disease (CKD) or renal impairment",
            "icon": "🫘",
        },
        {
            "name": "Celiac Disease",
            "description": "Gluten intolerance / celiac disease",
            "icon": "🌾",
        },
        {
            "name": "ADHD",
            "description": "Attention-deficit/hyperactivity disorder (sensitivity to artificial colors)",
            "icon": "🧠",
        },
    ]
    return Response({"conditions": SUPPORTED_CONDITIONS})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supported_allergies_view(request):
    """
    GET /api/health-profiles/supported-allergies/

    Returns the list of common allergen names — standardized to the same
    canonical strings that the scoring engine checks allergen_flag against.
    Users can still add custom allergies, but common ones are shown as chips.

    Response:
        {"allergies": ["Peanuts", "Tree Nuts", "Milk", "Eggs", "Wheat / Gluten", ...]}
    """
    COMMON_ALLERGENS = [
        "Peanuts",
        "Tree Nuts",
        "Milk",
        "Eggs",
        "Wheat / Gluten",
        "Soy",
        "Fish",
        "Shellfish",
        "Sesame",
        "Mustard",
        "Sulphites",
    ]
    return Response({"allergies": COMMON_ALLERGENS})
