"""
Explanations app — URL configuration.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Generate (or retrieve cached) explanation for a scored result
    path('generate/', views.generate_explanation_view, name='explanation-generate'),

    # Submit thumbs-up/down feedback on an explanation
    path('<int:explanation_id>/feedback/', views.submit_feedback_view, name='explanation-feedback'),
]
