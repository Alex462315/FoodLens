"""
URL configuration for FoodLens project.
"""
from django.contrib import admin
from django.urls import path, include
from .views import health_check

urlpatterns = [
    path('admin/', admin.site.urls),

    # Health check endpoint
    path('api/health/', health_check, name='health-check'),

    # Auth endpoints (registration, login)
    path('api/auth/', include('accounts.urls')),

    # Health Profile CRUD
    path('api/', include('health.urls')),

    # App API routes (to be populated in later phases)
    path('api/users/', include('users.urls')),
    path('api/products/', include('products.urls')),
    path('api/scoring/', include('scoring.urls')),
]
