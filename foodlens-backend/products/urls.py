"""
Products app — URL configuration
"""
from django.urls import path
from .views import product_lookup, product_alternatives_view

urlpatterns = [
    path('lookup/', product_lookup, name='product-lookup'),
    path('alternatives/', product_alternatives_view, name='product-alternatives'),
]
