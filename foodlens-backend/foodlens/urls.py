"""
URL configuration for FoodLens project.
"""
from django.contrib import admin
from django.urls import path, include
from .views import health_check
from users.views import admin_analytics_view, admin_users_list, admin_delete_user

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
    path('api/explanations/', include('explanations.urls')),

    # Admin endpoints (is_staff gated)
    path('api/admin/analytics/', admin_analytics_view, name='admin-analytics'),
    path('api/admin/users/', admin_users_list, name='admin-users-list'),
    path('api/admin/users/<int:user_id>/', admin_delete_user, name='admin-delete-user'),
]
