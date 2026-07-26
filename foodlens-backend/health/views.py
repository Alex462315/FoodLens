"""
Health app — ViewSet for Health Profile CRUD.

All endpoints require Token authentication. Users can only access
their own profiles — attempting to access another user's profile
returns 404 (not 403) to avoid leaking that the ID exists.
"""
from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

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
