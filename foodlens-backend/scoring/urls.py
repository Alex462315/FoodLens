"""
Scoring app — URL configuration.
"""
from django.urls import path

from . import views

urlpatterns = [
    path('parse-ingredients/', views.parse_ingredients_view, name='parse-ingredients'),
    path('compute/', views.compute_score_view, name='compute-score'),
    path('history/', views.scan_history_view, name='scan-history'),
    path('nutrition-summary/', views.nutrition_summary_view, name='nutrition-summary'),
    path('analytics/', views.analytics_view, name='analytics'),
    path('community/submit/', views.community_submit_view, name='community-submit'),
]
