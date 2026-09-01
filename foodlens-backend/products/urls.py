"""
Products app — URL configuration
"""
from django.urls import path
from .views import product_lookup

urlpatterns = [
    path('lookup/', product_lookup, name='product-lookup'),
]
