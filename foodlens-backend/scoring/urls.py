"""
Scoring app — URL configuration.
"""
from django.urls import path

from . import views

urlpatterns = [
    path('parse-ingredients/', views.parse_ingredients_view, name='parse-ingredients'),
    path('compute/', views.compute_score_view, name='compute-score'),
    path('history/', views.scan_history_view, name='scan-history'),
    path('history/<int:pk>/', views.scan_detail_view, name='scan-detail'),
    path('history/<int:pk>/pdf/', views.export_pdf_view, name='scan-detail-pdf'),
    path('report/<int:pk>/', views.public_web_report_view, name='public-web-report'),
    path('nutrition-summary/', views.nutrition_summary_view, name='nutrition-summary'),
    path('analytics/', views.analytics_view, name='analytics'),
    path('community/submit/', views.community_submit_view, name='community-submit'),
    path('ocr-extract/', views.ocr_extract_view, name='ocr-extract'),
    path('ocr-clean/', views.ocr_clean_view, name='ocr-clean'),
    # Calorie tracking
    path('calorie-goal/', views.calorie_goal_view, name='calorie-goal'),
    path('food-entries/', views.manual_food_entries_view, name='food-entries'),
    path('food-entries/<int:pk>/', views.delete_food_entry_view, name='food-entry-delete'),
    path('daily-calorie-summary/', views.daily_calorie_summary_view, name='daily-calorie-summary'),
    path('analyze-food-photo/', views.analyze_food_photo_view, name='analyze-food-photo'),
    path('calorie-check/', views.calorie_check_product_view, name='calorie-check'),
]
