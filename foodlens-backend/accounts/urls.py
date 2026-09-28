"""
Accounts app — URL configuration.
"""
from django.urls import path

from . import views

urlpatterns = [
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('google/', views.google_login_view, name='google-login'),
    path('update-username/', views.update_username_view, name='update-username'),
]
