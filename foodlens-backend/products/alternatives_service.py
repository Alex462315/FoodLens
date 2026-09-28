"""
Healthier Alternatives Service
Identifies the category of a food product and recommends 2-3 personalized,
healthier, lower-risk alternatives while strictly filtering out any allergens
or condition contraindications present in the user's active health profile.
"""

from typing import List, Dict, Any, Optional
from health.models import HealthProfile


# Curated catalog of clean, healthy alternatives with real nutrient profiles
HEALTHY_ALTERNATIVES_CATALOG = {
    'chocolate_spread': [
        {
            'id': 'alt_pb_roasted',
            'name': '100% Roasted Peanut Butter (Unsweetened)',
            'brand': 'Clean Whole Foods',
            'category': 'Nut Spreads',
            'image_url': 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&q=80',
            'normalized_score': 16.0,
            'risk_label': 'Low',
            'why_better': 'Zero added refined sugar (only 3g natural sugar vs 56g in chocolate spread), zero palm oil, and 8x more protein.',
            'nutrition': {
                'energy_kcal': 588,
                'sugars': 3.1,
                'fat': 50.0,
                'saturated_fat': 7.0,
                'salt': 0.05,
                'proteins': 26.0,
                'carbohydrates': 14.0,
                'fiber': 8.0,
            },
            'contains_allergens': ['peanut', 'peanuts'],
            'avoid_for_conditions': [],
        },
        {
            'id': 'alt_almond_butter',
            'name': '100% Raw Almond Butter (Stone Ground)',
            'brand': 'Pure Nutrition',
            'category': 'Nut Spreads',
            'image_url': 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&q=80',
            'normalized_score': 14.0,
            'risk_label': 'Low',
            'why_better': 'Rich in Vitamin E, monounsaturated heart-healthy fats, zero refined sugars, and high calcium.',
            'nutrition': {
                'energy_kcal': 614,
                'sugars': 4.4,
                'fat': 55.5,
                'saturated_fat': 4.7,
                'salt': 0.02,
                'proteins': 21.0,
                'carbohydrates': 18.0,
                'fiber': 10.5,
            },
            'contains_allergens': ['tree nut', 'tree nuts', 'almond', 'nuts'],
            'avoid_for_conditions': [],
        },
        {
            'id': 'alt_dark_tahini',
            'name': 'Organic Raw Tahini (Sesame Spread)',
            'brand': 'Whole Harvest',
            'category': 'Seed Spreads',
            'image_url': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80',
            'normalized_score': 12.0,
            'risk_label': 'Low',
            'why_better': '100% nut-free spread, loaded with sesamin antioxidants, bioavailable calcium, and practically zero sugar (0.5g).',
            'nutrition': {
                'energy_kcal': 595,
                'sugars': 0.5,
                'fat': 53.8,
                'saturated_fat': 7.5,
                'salt': 0.03,
                'proteins': 17.0,
                'carbohydrates': 21.2,
                'fiber': 9.3,
            },
            'contains_allergens': ['sesame', 'sesame seeds'],
            'avoid_for_conditions': [],
        },
    ],
    'soda_cola': [
        {
            'id': 'alt_tender_coconut',
            'name': 'Fresh Tender Coconut Water',
            'brand': 'Nature Choice',
            'category': 'Natural Hydration',
            'image_url': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&q=80',
            'normalized_score': 8.0,
            'risk_label': 'Low',
            'why_better': 'Natural potassium and magnesium electrolytes with zero added sugar, no phosphoric acid, and no artificial caramel color.',
            'nutrition': {
                'energy_kcal': 19,
                'sugars': 2.6,
                'fat': 0.2,
                'saturated_fat': 0.1,
                'salt': 0.05,
                'proteins': 0.7,
                'carbohydrates': 3.7,
                'fiber': 1.1,
            },
            'contains_allergens': [],
            'avoid_for_conditions': [],
        },
        {
            'id': 'alt_lemon_sparkling',
            'name': 'Sparkling Mineral Water with Fresh Lemon',
            'brand': 'Alpine Pure',
            'category': 'Zero Sugar Beverage',
            'image_url': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300&q=80',
            'normalized_score': 5.0,
            'risk_label': 'Low',
            'why_better': 'Satisfies the carbonated fizz craving with 0 calories, 0 sugar, and 0 chemical sweeteners (aspartame/sucralose).',
            'nutrition': {
                'energy_kcal': 2,
                'sugars': 0.0,
                'fat': 0.0,
                'saturated_fat': 0.0,
                'salt': 0.01,
                'proteins': 0.0,
                'carbohydrates': 0.3,
                'fiber': 0.0,
            },
            'contains_allergens': [],
            'avoid_for_conditions': [],
        },
        {
            'id': 'alt_spiced_buttermilk',
            'name': 'Traditional Spiced Chaas (Buttermilk)',
            'brand': 'Desi Natural',
            'category': 'Probiotic Drink',
            'image_url': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&q=80',
            'normalized_score': 14.0,
            'risk_label': 'Low',
            'why_better': 'Active gut probiotics and digestive spices (cumin, ginger) without sugar spikes or tooth enamel erosion.',
            'nutrition': {
                'energy_kcal': 32,
                'sugars': 1.8,
                'fat': 1.2,
                'saturated_fat': 0.8,
                'salt': 0.25,
                'proteins': 3.1,
                'carbohydrates': 2.4,
                'fiber': 0.2,
            },
            'contains_allergens': ['dairy', 'milk', 'lactose'],
            'avoid_for_conditions': [],
        },
    ],
    'potato_chips': [
        {
            'id': 'alt_roasted_makhana',
            'name': 'Roasted Himalayan Salt Makhana (Foxnuts)',
            'brand': 'Healthy Snacks Co.',
            'category': 'Superfood Snack',
            'image_url': 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=300&q=80',
            'normalized_score': 10.0,
            'risk_label': 'Low',
            'why_better': 'Non-fried, 90% less saturated fat than potato crisps, zero trans-fats, and high antioxidant flavonoid content.',
            'nutrition': {
                'energy_kcal': 350,
                'sugars': 0.4,
                'fat': 2.2,
                'saturated_fat': 0.4,
                'salt': 0.35,
                'proteins': 9.7,
                'carbohydrates': 74.0,
                'fiber': 14.5,
            },
            'contains_allergens': [],
            'avoid_for_conditions': [],
        },
        {
            'id': 'alt_roasted_chana',
            'name': 'Roasted Spiced Black Chickpeas (Chana)',
            'brand': 'FitBites',
            'category': 'High Protein Snack',
            'image_url': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&q=80',
            'normalized_score': 9.0,
            'risk_label': 'Low',
            'why_better': '19g natural plant protein and slow-digesting dietary fiber preventing hunger spikes. Zero palm oil frying.',
            'nutrition': {
                'energy_kcal': 365,
                'sugars': 1.2,
                'fat': 5.2,
                'saturated_fat': 0.6,
                'salt': 0.30,
                'proteins': 19.5,
                'carbohydrates': 58.0,
                'fiber': 15.0,
            },
            'contains_allergens': [],
            'avoid_for_conditions': [],
        },
        {
            'id': 'alt_baked_millet_chips',
            'name': 'Baked Multi-Millet Herb Crisps',
            'brand': 'Millet Magic',
            'category': 'Baked Snacks',
            'image_url': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&q=80',
            'normalized_score': 18.0,
            'risk_label': 'Low',
            'why_better': 'Oven-baked whole grains (Ragi, Jowar, Bajra) delivering complex carbs and 65% less sodium than commercial chips.',
            'nutrition': {
                'energy_kcal': 380,
                'sugars': 1.5,
                'fat': 7.5,
                'saturated_fat': 1.1,
                'salt': 0.45,
                'proteins': 8.8,
                'carbohydrates': 68.0,
                'fiber': 9.2,
            },
            'contains_allergens': [],
            'avoid_for_conditions': [],
        },
    ],
    'instant_noodles': [
        {
            'id': 'alt_millet_noodles',
            'name': '100% Whole Wheat & Ragi Sun-Dried Noodles',
            'brand': 'Earth Kitchen',
            'category': 'Whole Grain Pasta',
            'image_url': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&q=80',
            'normalized_score': 15.0,
            'risk_label': 'Low',
            'why_better': 'Air-dried rather than flash-fried in palm oil. No TBHQ preservative, zero MSG, and triple the dietary fiber.',
            'nutrition': {
                'energy_kcal': 345,
                'sugars': 1.8,
                'fat': 1.5,
                'saturated_fat': 0.3,
                'salt': 0.30,
                'proteins': 12.5,
                'carbohydrates': 69.0,
                'fiber': 9.8,
            },
            'contains_allergens': ['gluten', 'wheat'],
            'avoid_for_conditions': [],
        },
        {
            'id': 'alt_savory_oats',
            'name': 'Whole Rolled Oats Savory Masala Bowl',
            'brand': 'NutriGrain',
            'category': 'Whole Grains',
            'image_url': 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=300&q=80',
            'normalized_score': 11.0,
            'risk_label': 'Low',
            'why_better': 'High soluble beta-glucan fiber proven to maintain cholesterol and cardiovascular health, without trans fats.',
            'nutrition': {
                'energy_kcal': 360,
                'sugars': 1.2,
                'fat': 5.8,
                'saturated_fat': 1.1,
                'salt': 0.25,
                'proteins': 13.0,
                'carbohydrates': 62.0,
                'fiber': 10.5,
            },
            'contains_allergens': [],
            'avoid_for_conditions': [],
        },
        {
            'id': 'alt_edamame_noodles',
            'name': 'Pure Organic Edamame Noodles',
            'brand': 'Green Protein',
            'category': 'Plant Protein Pasta',
            'image_url': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80',
            'normalized_score': 12.0,
            'risk_label': 'Low',
            'why_better': 'Gluten-free, grain-free alternative packing an astounding 42g plant protein per 100g with ultra-low glycemic load.',
            'nutrition': {
                'energy_kcal': 320,
                'sugars': 2.1,
                'fat': 4.0,
                'saturated_fat': 0.7,
                'salt': 0.05,
                'proteins': 42.0,
                'carbohydrates': 21.0,
                'fiber': 18.0,
            },
            'contains_allergens': ['soy'],
            'avoid_for_conditions': [],
        },
    ],
    'sweet_biscuits': [
        {
            'id': 'alt_rolled_oats_cookies',
            'name': 'Whole Rolled Oats & Chia Seed Biscuits',
            'brand': 'Grain Pure',
            'category': 'Whole Grain Bakery',
            'image_url': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&q=80',
            'normalized_score': 18.0,
            'risk_label': 'Low',
            'why_better': '75% less sugar than cream biscuits, made without refined white flour (maida) or hydrogenated shortening.',
            'nutrition': {
                'energy_kcal': 410,
                'sugars': 7.5,
                'fat': 13.0,
                'saturated_fat': 2.5,
                'salt': 0.20,
                'proteins': 11.0,
                'carbohydrates': 58.0,
                'fiber': 8.5,
            },
            'contains_allergens': ['gluten', 'seeds'],
            'avoid_for_conditions': [],
        },
        {
            'id': 'alt_ragi_almond_cookies',
            'name': 'Stone-Ground Ragi & Almond Crunch',
            'brand': 'Traditional Harvest',
            'category': 'Millet Bakery',
            'image_url': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&q=80',
            'normalized_score': 20.0,
            'risk_label': 'Low',
            'why_better': 'Naturally sweetened with dates, high bioavailable calcium from finger millet, and zero high-fructose corn syrup.',
            'nutrition': {
                'energy_kcal': 425,
                'sugars': 9.8,
                'fat': 15.0,
                'saturated_fat': 3.0,
                'salt': 0.15,
                'proteins': 9.5,
                'carbohydrates': 61.0,
                'fiber': 7.2,
            },
            'contains_allergens': ['tree nut', 'tree nuts', 'almond', 'nuts'],
            'avoid_for_conditions': [],
        },
    ],
    'fruit_juice_sweetened': [
        {
            'id': 'alt_cold_pressed_orange_carrot',
            'name': 'Cold-Pressed Whole Orange & Carrot Juice',
            'brand': 'Raw Botanics',
            'category': 'Fresh Cold Pressed',
            'image_url': 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&q=80',
            'normalized_score': 14.0,
            'risk_label': 'Low',
            'why_better': 'Zero added sucrose or high-fructose corn syrup. Cold extraction preserves Vitamin C, live enzymes, and beta-carotene.',
            'nutrition': {
                'energy_kcal': 38,
                'sugars': 6.2,
                'fat': 0.1,
                'saturated_fat': 0.0,
                'salt': 0.02,
                'proteins': 0.9,
                'carbohydrates': 8.5,
                'fiber': 2.4,
            },
            'contains_allergens': [],
            'avoid_for_conditions': ['Diabetes'],
        },
        {
            'id': 'alt_lemon_mint_chia',
            'name': 'Infused Lemon Mint Chia Seed Fresca',
            'brand': 'Vitality Drink',
            'category': 'Functional Beverage',
            'image_url': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300&q=80',
            'normalized_score': 8.0,
            'risk_label': 'Low',
            'why_better': 'Omega-3 fatty acids and soluble fiber from swollen chia seeds. Less than 1g total sugar per serving.',
            'nutrition': {
                'energy_kcal': 24,
                'sugars': 0.8,
                'fat': 1.2,
                'saturated_fat': 0.1,
                'salt': 0.01,
                'proteins': 1.8,
                'carbohydrates': 2.5,
                'fiber': 3.1,
            },
            'contains_allergens': [],
            'avoid_for_conditions': [],
        },
    ],
    'default_clean': [
        {
            'id': 'alt_trail_mix_raw',
            'name': 'Raw Walnut, Pumpkin & Sunflower Seed Mix',
            'brand': 'SunHarvest',
            'category': 'Superfood Seeds & Nuts',
            'image_url': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80',
            'normalized_score': 12.0,
            'risk_label': 'Low',
            'why_better': '100% whole raw ingredients. Rich in plant omega-3 (ALA), zinc, and magnesium without any preservatives or additives.',
            'nutrition': {
                'energy_kcal': 540,
                'sugars': 2.2,
                'fat': 45.0,
                'saturated_fat': 5.2,
                'salt': 0.02,
                'proteins': 18.5,
                'carbohydrates': 15.0,
                'fiber': 9.0,
            },
            'contains_allergens': ['tree nut', 'tree nuts', 'walnut', 'seeds'],
            'avoid_for_conditions': [],
        },
        {
            'id': 'alt_steamed_edamame',
            'name': 'Steamed Organic Edamame Pods',
            'brand': 'Pure Harvest',
            'category': 'Whole Legume',
            'image_url': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80',
            'normalized_score': 8.0,
            'risk_label': 'Low',
            'why_better': 'Single ingredient whole food. Complete protein with all 9 essential amino acids, fiber, and near-zero sodium.',
            'nutrition': {
                'energy_kcal': 122,
                'sugars': 2.2,
                'fat': 5.2,
                'saturated_fat': 0.6,
                'salt': 0.01,
                'proteins': 11.9,
                'carbohydrates': 8.9,
                'fiber': 5.2,
            },
            'contains_allergens': ['soy'],
            'avoid_for_conditions': [],
        },
    ],
}


def detect_product_category(product_name: str, categories: str = '', ingredients: str = '') -> str:
    """
    Analyzes the product title, OFF categories, and ingredients
    to determine which food category it belongs to.
    """
    text = f"{product_name} {categories} {ingredients}".lower()

    # Chocolate / sweet spreads
    if any(k in text for k in ['nutella', 'chocolate spread', 'hazelnut spread', 'cocoa spread', 'sweet spread', 'chocolate paste', 'hershey']):
        return 'chocolate_spread'

    # Soda / soft drinks / energy drinks
    if any(k in text for k in ['cola', 'coke', 'pepsi', 'sprite', 'fanta', 'soda', 'carbonated', 'soft drink', 'red bull', 'monster energy', 'thums up']):
        return 'soda_cola'

    # Fried chips / crisps
    if any(k in text for k in ['chips', 'crisps', 'lays', 'lay\'s', 'kurkure', 'doritos', 'pringles', 'cheetos', 'potato chips', 'nachos', 'wafers']):
        return 'potato_chips'

    # Instant noodles / ramen
    if any(k in text for k in ['noodle', 'noodles', 'maggi', 'ramen', 'yippee', 'top ramen', 'instant noodle', 'cup noodle']):
        return 'instant_noodles'

    # Biscuits / cookies / cakes
    if any(k in text for k in ['biscuit', 'biscuits', 'cookie', 'cookies', 'oreo', 'bourbon', 'parle-g', 'good day', 'hide & seek', 'marie gold', 'wafer']):
        return 'sweet_biscuits'

    # Sugary juice / nectar
    if any(k in text for k in ['juice', 'nectar', 'frooti', 'maaza', 'tropicana', 'real fruit', 'fruit drink', 'tang', 'squash']):
        return 'fruit_juice_sweetened'

    return 'default_clean'


def find_healthier_alternatives(
    product_name: str,
    categories: str = '',
    ingredients_text: str = '',
    profile: Optional[HealthProfile] = None,
    limit: int = 3,
) -> List[Dict[str, Any]]:
    """
    Finds and personalizes healthy alternatives for the given product.
    Loads dynamically from the MySQL HealthyAlternative table (managed via Django Admin),
    falling back to the built-in catalog if the database table is empty.
    Excludes candidates containing allergens registered in the user's active profile,
    or contraindicating any health conditions.
    """
    from .models import HealthyAlternative

    category = detect_product_category(product_name, categories, ingredients_text)
    candidate_list: List[Dict[str, Any]] = []

    # 1. Query from MySQL Database table first
    db_items = HealthyAlternative.objects.filter(category=category, is_active=True)
    if not db_items.exists() and category != 'default_clean':
        # Also try default_clean from DB
        db_items = HealthyAlternative.objects.filter(category='default_clean', is_active=True)

    if db_items.exists():
        for obj in db_items:
            candidate_list.append({
                'id': f'db_{obj.id}',
                'name': obj.name,
                'brand': obj.brand,
                'category': obj.get_category_display(),
                'image_url': obj.image_url,
                'normalized_score': obj.normalized_score,
                'risk_label': obj.risk_label,
                'why_better': obj.why_better,
                'nutrition': {
                    'energy_kcal': obj.energy_kcal,
                    'sugars': obj.sugars,
                    'proteins': obj.proteins,
                    'fat': obj.fat,
                    'saturated_fat': obj.saturated_fat,
                    'salt': obj.salt,
                    'fiber': obj.fiber,
                    'carbohydrates': obj.carbohydrates,
                },
                'contains_allergens': obj.get_allergens_list(),
                'avoid_for_conditions': obj.get_avoid_conditions_list(),
            })

    # 2. Fallback to in-memory catalog if database returned empty
    if not candidate_list:
        candidate_list = list(HEALTHY_ALTERNATIVES_CATALOG.get(category, []))
        if len(candidate_list) < 2:
            candidate_list.extend(HEALTHY_ALTERNATIVES_CATALOG.get('default_clean', []))

    # Extract user profile allergens and conditions
    user_allergens = set()
    user_conditions = set()

    if profile:
        for a in profile.allergies.all():
            user_allergens.add(a.allergen_name.strip().lower())
        for c in profile.conditions.all():
            user_conditions.add(c.condition_name.strip().lower())

    filtered_alternatives = []

    for item in candidate_list:
        # Check allergen safety
        has_allergen_conflict = False
        item_allergens = [a.lower() for a in item.get('contains_allergens', [])]

        for u_allergen in user_allergens:
            if any(u_allergen in a or a in u_allergen for a in item_allergens):
                has_allergen_conflict = True
                break

        if has_allergen_conflict:
            continue

        # Check condition safety (e.g. strict sugar cap for Diabetes)
        has_condition_conflict = False
        avoid_conds = [c.lower() for c in item.get('avoid_for_conditions', [])]
        for u_cond in user_conditions:
            if u_cond in avoid_conds:
                has_condition_conflict = True
                break
            if 'diabetes' in u_cond and item.get('nutrition', {}).get('sugars', 0) > 10.0:
                has_condition_conflict = True
                break
            if 'hypertension' in u_cond and item.get('nutrition', {}).get('salt', 0) > 0.8:
                has_condition_conflict = True
                break

        if has_condition_conflict:
            continue

        filtered_alternatives.append(item)

    # If all items were filtered out due to severe allergies, pull from allergen-free clean items
    if not filtered_alternatives:
        for item in HEALTHY_ALTERNATIVES_CATALOG.get('default_clean', []):
            if not any(a in user_allergens for a in [x.lower() for x in item.get('contains_allergens', [])]):
                filtered_alternatives.append(item)

    return filtered_alternatives[:limit]
