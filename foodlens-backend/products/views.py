"""
Products app — Views
Product lookup endpoint proxying to Open Food Facts API.
"""

import requests
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


OPEN_FOOD_FACTS_API_URL = 'https://world.openfoodfacts.org/api/v2/product'
OFF_TIMEOUT_SECONDS = 8  # Generous timeout for slow responses


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_lookup(request):
    """
    GET /api/products/lookup/?barcode=<code>

    Proxies the barcode lookup to Open Food Facts API and normalizes the
    response to a consistent shape.

    Returns:
        - found=true + product data if the barcode exists in OFF database
        - found=false if the barcode is not in their database (NOT a 404/error)
        - error message if OFF is unreachable/slow
    """
    barcode = request.query_params.get('barcode', '').strip()

    if not barcode:
        return Response(
            {'error': 'The "barcode" query parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Only allow numeric barcodes (EAN-8, EAN-13, UPC-A, etc.)
    if not barcode.isdigit():
        return Response(
            {'error': 'Barcode must contain only digits.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        off_response = requests.get(
            f'{OPEN_FOOD_FACTS_API_URL}/{barcode}',
            headers={
                'User-Agent': 'FoodLens/1.0 (capstone project; contact@foodlens.dev)',
            },
            timeout=OFF_TIMEOUT_SECONDS,
        )
    except requests.exceptions.Timeout:
        return Response(
            {
                'error': 'Open Food Facts is taking too long to respond. Please try again.',
                'barcode': barcode,
            },
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )
    except requests.exceptions.ConnectionError:
        return Response(
            {
                'error': 'Could not connect to Open Food Facts. Please try again later.',
                'barcode': barcode,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except requests.exceptions.RequestException as e:
        return Response(
            {
                'error': f'An error occurred while looking up the product: {str(e)}',
                'barcode': barcode,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # Open Food Facts returns 200 even for not-found products,
    # but the response body indicates status via the "status" field.
    if off_response.status_code != 200:
        return Response(
            {
                'found': False,
                'barcode': barcode,
                'error': f'Open Food Facts returned status {off_response.status_code}.',
            },
            status=status.HTTP_200_OK,
        )

    data = off_response.json()

    # OFF uses status=1 for found, status=0 for not found
    if data.get('status') != 1 or not data.get('product'):
        return Response(
            {
                'found': False,
                'barcode': barcode,
            },
            status=status.HTTP_200_OK,
        )

    # Normalize the response to a consistent shape
    product = data['product']

    # Extract the best available product name
    name = (
        product.get('product_name')
        or product.get('product_name_en')
        or product.get('generic_name')
        or product.get('generic_name_en')
        or 'Unknown Product'
    )

    # Extract brand — OFF sometimes has multiple comma-separated brands
    brand = product.get('brands', '') or 'Unknown Brand'

    # Extract product image — prefer front image
    image_url = (
        product.get('image_front_url')
        or product.get('image_url')
        or product.get('image_front_small_url')
        or None
    )

    # Extract ingredients text — try English first, then any available
    ingredients_text = (
        product.get('ingredients_text_en')
        or product.get('ingredients_text')
        or ''
    )

    # Extract nutrition grade if available (nutriscore)
    nutriscore_grade = product.get('nutriscore_grade') or product.get('nutrition_grades') or None

    # Extract allergens
    allergens = product.get('allergens') or ''

    # Extract categories
    categories = product.get('categories') or ''

    # Extract nutritional data (per 100g) from OFF's nutriments object
    nutriments = product.get('nutriments', {})
    nutrition_data = {
        'energy_kcal': nutriments.get('energy-kcal_100g') or nutriments.get('energy-kcal') or None,
        'fat': nutriments.get('fat_100g') or None,
        'saturated_fat': nutriments.get('saturated-fat_100g') or None,
        'sugars': nutriments.get('sugars_100g') or None,
        'proteins': nutriments.get('proteins_100g') or None,
        'salt': nutriments.get('salt_100g') or None,
        'fiber': nutriments.get('fiber_100g') or None,
        'carbohydrates': nutriments.get('carbohydrates_100g') or None,
    }

    # Serving size
    serving_size = product.get('serving_size') or None

    return Response(
        {
            'found': True,
            'barcode': barcode,
            'name': name.strip(),
            'brand': brand.strip(),
            'image_url': image_url,
            'ingredients_text': ingredients_text.strip(),
            'nutriscore_grade': nutriscore_grade,
            'allergens': allergens.strip(),
            'categories': categories.strip(),
            'nutrition': nutrition_data,
            'serving_size': serving_size,
        },
        status=status.HTTP_200_OK,
    )
