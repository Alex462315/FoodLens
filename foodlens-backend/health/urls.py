"""
Health app — URL configuration using DRF Router.

Generates standard CRUD endpoints at /api/health-profiles/.
Also exposes two read-only endpoints:
  GET /api/health-profiles/supported-conditions/   — controlled list of condition names
  GET /api/health-profiles/supported-allergies/    — common allergen names
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import HealthProfileViewSet, supported_conditions_view, supported_allergies_view

router = DefaultRouter()
router.register(r'health-profiles', HealthProfileViewSet, basename='healthprofile')

urlpatterns = [
    path('', include(router.urls)),
    path('health-profiles/supported-conditions/', supported_conditions_view, name='supported-conditions'),
    path('health-profiles/supported-allergies/', supported_allergies_view, name='supported-allergies'),
]
