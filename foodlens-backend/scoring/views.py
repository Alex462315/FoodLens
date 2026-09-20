"""
Scoring app — Views for ingredient parsing and scoring endpoints.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from health.models import HealthProfile
from .engine import parse_ingredients_text, compute_score


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_ingredients_view(request):
    """
    POST /api/scoring/parse-ingredients/

    Accepts a raw ingredients text string (from Open Food Facts or OCR)
    and returns a list of matched/unmatched ingredients with position order.

    Request body:
        { "raw_text": "Corn Grits, Sugar, Salt, Malt Flavor, BHA" }
    """
    raw_text = request.data.get('raw_text', '').strip()

    if not raw_text:
        return Response(
            {'error': 'The "raw_text" field is required and must not be empty.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ingredients = parse_ingredients_text(raw_text)

    matched_count = sum(1 for i in ingredients if i['matched_ingredient_id'] is not None)
    unmatched_count = len(ingredients) - matched_count

    return Response(
        {
            'raw_text': raw_text,
            'total_tokens': len(ingredients),
            'matched_count': matched_count,
            'unmatched_count': unmatched_count,
            'ingredients': ingredients,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def compute_score_view(request):
    """
    POST /api/scoring/compute/

    Computes the personalized health risk score for a set of ingredients
    against a specific health profile.

    Request body:
        {
            "ingredients": [
                {"ingredient_id": 12, "position": 1, "raw_token": "Sugar"},
                {"ingredient_id": null, "position": 2, "raw_token": "Malt Flavor"},
                ...
            ],
            "profile_id": 7
        }

    Response:
        {
            "raw_score": "15.2300",
            "normalized_score": "60.92",
            "risk_label": "Moderate",
            "has_allergen_warning": true,
            "allergen_details": ["Peanuts"],
            "scored_result_id": 42,
            "ingredient_breakdown": [
                {
                    "position": 1,
                    "raw_token": "Sugar",
                    "matched_name": "Sugar",
                    "category": "sweetener",
                    "base_risk_score": "6.00",
                    "adjusted_score": "9.00",
                    "position_weight": "1.0000",
                    "ingredient_impact": "9.0000",
                    "is_allergen_trigger": false
                },
                ...
            ]
        }
    """
    ingredients_data = request.data.get('ingredients')
    profile_id = request.data.get('profile_id')

    # Validate required fields
    if not ingredients_data:
        return Response(
            {'error': 'The "ingredients" field is required (list of ingredient objects).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(ingredients_data, list):
        return Response(
            {'error': 'The "ingredients" field must be a list.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not profile_id:
        return Response(
            {'error': 'The "profile_id" field is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate profile ownership — user can only score against their own profiles
    try:
        profile = HealthProfile.objects.get(
            id=profile_id,
            user=request.user,
        )
    except HealthProfile.DoesNotExist:
        return Response(
            {'error': 'Health profile not found or does not belong to you.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Validate ingredient items
    for i, item in enumerate(ingredients_data):
        if not isinstance(item, dict):
            return Response(
                {'error': f'ingredients[{i}] must be an object with "ingredient_id" and "position".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if 'position' not in item:
            return Response(
                {'error': f'ingredients[{i}] is missing "position".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Compute the score (pass product metadata + nutrition for history tracking)
    product_meta = {
        'barcode': request.data.get('barcode', ''),
        'product_name': request.data.get('product_name', ''),
        'product_image_url': request.data.get('product_image_url', ''),
        'nutrition_data': request.data.get('nutrition', {}),
    }

    try:
        result = compute_score(ingredients_data, profile, product_meta=product_meta)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Scoring computation failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(result, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scan_history_view(request):
    """
    GET /api/scoring/history/

    Returns the user's past scans in reverse-chronological order.
    Only returns scans from profiles owned by the current user.

    Response:
        [
            {
                "id": 42,
                "barcode": "3017620422003",
                "product_name": "Nutella",
                "product_image_url": "https://...",
                "normalized_score": "65.00",
                "risk_label": "Moderate",
                "has_allergen_warning": false,
                "created_at": "2026-08-31T10:30:00Z"
            },
            ...
        ]
    """
    from .models import ScoredResult, ScoredIngredientDetail

    scans = ScoredResult.objects.filter(
        profile__user=request.user
    ).order_by('-created_at')[:50]

    result = []
    for s in scans:
        result.append({
            'id': s.id,
            'barcode': s.barcode,
            'product_name': s.product_name,
            'product_image_url': s.product_image_url,
            'normalized_score': str(s.normalized_score),
            'risk_label': s.risk_label,
            'has_allergen_warning': s.has_allergen_warning,
            'allergen_details': s.allergen_details,
            'nutrition_data': s.nutrition_data or {},
            'created_at': s.created_at.isoformat(),
        })

    return Response(result, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scan_detail_view(request, pk):
    """
    GET /api/scoring/history/<id>/

    Returns the full detail of a single past scan — including
    nutrition_data and ingredient_breakdown — so the HistoryScreen
    can navigate to a re-rendered ProductResultScreen.
    """
    from .models import ScoredResult, ScoredIngredientDetail

    try:
        scan = ScoredResult.objects.get(pk=pk, profile__user=request.user)
    except ScoredResult.DoesNotExist:
        return Response({'error': 'Scan not found.'}, status=status.HTTP_404_NOT_FOUND)

    breakdown = []
    for d in ScoredIngredientDetail.objects.filter(scored_result=scan).select_related('ingredient'):
        breakdown.append({
            'original_name': d.original_name,
            'matched_name': d.ingredient.name if d.ingredient else None,
            'category': d.ingredient.category if d.ingredient else None,
            'position': d.position,
            'adjusted_risk_score': float(d.adjusted_risk_score),
        })

    return Response({
        'id': scan.id,
        'barcode': scan.barcode,
        'product_name': scan.product_name,
        'product_image_url': scan.product_image_url,
        'normalized_score': float(scan.normalized_score),
        'risk_label': scan.risk_label,
        'has_allergen_warning': scan.has_allergen_warning,
        'allergen_details': scan.allergen_details,
        'nutrition_data': scan.nutrition_data or {},
        'ingredient_breakdown': breakdown,
        'created_at': scan.created_at.isoformat(),
    }, status=status.HTTP_200_OK)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nutrition_summary_view(request):
    """
    GET /api/scoring/nutrition-summary/?period=daily|weekly

    Aggregates nutritional data from the user's scan history.

    Returns:
        {
            "period": "weekly",
            "scan_count": 12,
            "totals": {
                "energy_kcal": 4320.5,
                "fat": 198.2,
                "sugars": 312.0,
                "proteins": 89.4,
                "salt": 24.1,
                "fiber": 45.2,
                "carbohydrates": 640.0
            },
            "averages": {
                "energy_kcal": 360.0,
                ...
            },
            "daily_breakdown": [
                {
                    "date": "2026-09-01",
                    "scan_count": 3,
                    "energy_kcal": 820.0,
                    "sugars": 65.0,
                    ...
                }
            ],
            "top_products": [
                {"product_name": "Nutella", "energy_kcal": 539, "sugars": 56.3}
            ]
        }
    """
    from .models import ScoredResult
    from django.utils import timezone
    from datetime import timedelta, date
    from collections import defaultdict

    period = request.query_params.get('period', 'weekly')

    # Determine date range
    now = timezone.now()
    if period == 'daily':
        since = now - timedelta(days=1)
    elif period == 'monthly':
        since = now - timedelta(days=30)
    else:  # weekly (default)
        since = now - timedelta(days=7)

    scans = ScoredResult.objects.filter(
        profile__user=request.user,
        created_at__gte=since,
    ).order_by('-created_at')

    NUTRIENT_KEYS = ['energy_kcal', 'fat', 'saturated_fat', 'sugars',
                     'proteins', 'salt', 'fiber', 'carbohydrates']

    totals = {k: 0.0 for k in NUTRIENT_KEYS}
    daily_data = defaultdict(lambda: {'scan_count': 0, **{k: 0.0 for k in NUTRIENT_KEYS}})
    top_products = []
    scan_count = 0

    for scan in scans:
        nutrition = scan.nutrition_data or {}
        if not nutrition:
            continue

        scan_count += 1
        day_key = scan.created_at.strftime('%Y-%m-%d')
        daily_data[day_key]['scan_count'] += 1

        for key in NUTRIENT_KEYS:
            val = nutrition.get(key)
            if val is not None:
                try:
                    val = float(val)
                    totals[key] += val
                    daily_data[day_key][key] += val
                except (TypeError, ValueError):
                    pass

        # Collect top products data
        if scan.product_name and nutrition.get('energy_kcal'):
            top_products.append({
                'product_name': scan.product_name,
                'product_image_url': scan.product_image_url,
                'energy_kcal': nutrition.get('energy_kcal'),
                'sugars': nutrition.get('sugars'),
                'fat': nutrition.get('fat'),
                'salt': nutrition.get('salt'),
                'scanned_at': scan.created_at.strftime('%Y-%m-%d %H:%M'),
            })

    # Build daily breakdown sorted by date
    daily_breakdown = []
    for day, data in sorted(daily_data.items()):
        daily_breakdown.append({'date': day, **data})

    # Compute averages
    averages = {}
    if scan_count > 0:
        averages = {k: round(v / scan_count, 2) for k, v in totals.items()}
    else:
        averages = {k: 0.0 for k in NUTRIENT_KEYS}

    return Response({
        'period': period,
        'scan_count': scan_count,
        'total_scans_in_period': scans.count(),   # includes scans without nutrition
        'totals': {k: round(v, 2) for k, v in totals.items()},
        'averages': averages,
        'daily_breakdown': daily_breakdown,
        'top_products': top_products[:10],
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_view(request):
    """
    GET /api/scoring/analytics/

    Returns aggregate analytics:
    - Most commonly flagged high-risk ingredients across all user scans
    - Overall score distribution (Low / Moderate / High)
    - Allergen warning statistics
    - Total scans in system

    Abstract: "Administration and Analytics — aggregate analytics view
    highlighting the most commonly flagged ingredients across all users
    over a given period."
    """
    from django.db.models import Count, Avg
    from .models import ScoredResult, ScoredIngredientDetail, Ingredient

    # All results for this user (can be expanded to all users for admin later)
    user_results = ScoredResult.objects.filter(profile__user=request.user)
    total_scans = user_results.count()

    if total_scans == 0:
        return Response({
            'total_scans': 0,
            'top_flagged_ingredients': [],
            'score_distribution': {'Low': 0, 'Moderate': 0, 'High': 0},
            'allergen_warning_count': 0,
            'average_score': 0.0,
        }, status=status.HTTP_200_OK)

    # Top flagged high-risk ingredients across all scans
    flagged = (
        ScoredIngredientDetail.objects
        .filter(scored_result__in=user_results)
        .values('ingredient__name', 'ingredient__category', 'ingredient__base_risk_score')
        .annotate(times_seen=Count('id'))
        .order_by('-times_seen', '-ingredient__base_risk_score')[:15]
    )

    top_flagged = [
        {
            'ingredient': f['ingredient__name'],
            'category': f['ingredient__category'],
            'base_risk_score': float(f['ingredient__base_risk_score'] or 0),
            'times_seen': f['times_seen'],
        }
        for f in flagged
    ]

    # Score distribution
    dist = {'Low': 0, 'Moderate': 0, 'High': 0, 'Unknown': 0}
    for r in user_results.values_list('risk_label', flat=True):
        if r in dist:
            dist[r] += 1

    # Average score & allergen count
    agg = user_results.aggregate(avg=Avg('normalized_score'))
    allergen_count = user_results.filter(has_allergen_warning=True).count()

    return Response({
        'total_scans': total_scans,
        'top_flagged_ingredients': top_flagged,
        'score_distribution': dist,
        'allergen_warning_count': allergen_count,
        'average_score': round(float(agg['avg'] or 0), 1),
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def community_submit_view(request):
    """
    POST /api/scoring/community/submit/

    Accepts a user-submitted product (name, brand, barcode, ingredients_text,
    nutrition) for admin review before adding to the ingredient database.

    Abstract: "Community-Sourced Product Database."
    """
    product_name = request.data.get('product_name', '').strip()
    ingredients_text = request.data.get('ingredients_text', '').strip()

    if not product_name or not ingredients_text:
        return Response(
            {'error': '"product_name" and "ingredients_text" are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Log submission (in Phase 2 this would persist to a CommunitySubmission model)
    import logging
    logger = logging.getLogger(__name__)
    logger.info(
        'Community submission from user=%s: product=%s',
        request.user.username, product_name,
    )

    return Response({
        'status': 'received',
        'message': (
            f'Thank you! "{product_name}" has been submitted for review. '
            'It will be added to the FoodLens ingredient database after verification.'
        ),
    }, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────────────────────────
# OCR Extraction Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ocr_extract_view(request):
    """
    POST /api/scoring/ocr-extract/

    Accepts a multipart image upload of a food product ingredient label.
    Runs preprocessing (grayscale → CLAHE → deskew → binarize) then
    Tesseract OCR, and returns the extracted text with a real confidence score.

    Request (multipart/form-data):
        image: <file>   — JPEG/PNG photo of ingredient label

    Response:
        {
            "raw_text":   "Sugar, Salt, Water, ...",
            "confidence": 82         ← genuine per-word average from Tesseract
        }

    The caller should feed raw_text directly into /api/scoring/parse-ingredients/
    using the same flow as the barcode path.

    Error responses:
        400 — no image in request, or image cannot be decoded
        503 — Tesseract binary not found / OCR library error
    """
    from .ocr_service import extract_text_from_image

    # ── Validate upload ───────────────────────────────────────────────────────
    image_file = request.FILES.get('image')
    if not image_file:
        return Response(
            {'error': 'No image provided. Send a multipart/form-data request with an "image" field.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    allowed_types = {'image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'}
    if image_file.content_type not in allowed_types:
        return Response(
            {'error': f'Unsupported image type: {image_file.content_type}. Use JPEG or PNG.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    max_size_bytes = 15 * 1024 * 1024  # 15 MB
    if image_file.size > max_size_bytes:
        return Response(
            {'error': 'Image too large. Maximum allowed size is 15 MB.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Run OCR ───────────────────────────────────────────────────────────────
    try:
        image_bytes = image_file.read()
        result = extract_text_from_image(image_bytes)
    except FileNotFoundError as e:
        # Tesseract binary missing or wrong path
        return Response(
            {
                'error': 'OCR engine not available. Tesseract binary not found.',
                'detail': str(e),
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as e:
        return Response(
            {
                'error': 'OCR processing failed.',
                'detail': str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── Return result ─────────────────────────────────────────────────────────
    raw_text = result['raw_text']
    confidence = result['confidence']

    if not raw_text:
        return Response(
            {
                'raw_text': '',
                'confidence': 0,
                'warning': 'No text could be extracted from this image. '
                           'Try retaking the photo with better lighting and a steady hand.',
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {
            'raw_text': raw_text,
            'confidence': confidence,
        },
        status=status.HTTP_200_OK,
    )

