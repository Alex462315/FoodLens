"""
Health app — URL configuration using DRF Router.

Generates standard CRUD endpoints at /api/health-profiles/.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import HealthProfileViewSet

router = DefaultRouter()
router.register(r'health-profiles', HealthProfileViewSet, basename='healthprofile')

urlpatterns = [
    path('', include(router.urls)),
]
