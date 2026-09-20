"""
Scoring app — Core engine functions (reusable across views, OCR, etc.)

This module contains the ingredient-matching and scoring logic decoupled from
HTTP request/response handling, so it can be called by:
  - The parse-ingredients API endpoint
  - A future OCR pipeline
  - The scoring compute endpoint
  - Unit tests
"""
import re
from decimal import Decimal, ROUND_HALF_UP
from typing import List, TypedDict, Optional, Dict, Any

from django.db.models import Q

from .models import (
    Ingredient, IngredientAlias, ConditionMultiplier,
    ScoredResult, ScoredIngredientDetail,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Severity weights — exactly as specified in the project prompt (Part 4)
SEVERITY_WEIGHT = {
    'mild': Decimal('0.5'),
    'moderate': Decimal('1.0'),
    'severe': Decimal('1.5'),
}

# Normalization ceiling for raw_score -> 0-100.
# Calibration rationale (updated):
#   The harmonic series for positions 1..10 = 1 + 0.5 + 0.33 + 0.25 + ... ≈ 2.93
#   For a diabetic eating Nutella (sugar at pos1, risk=9 after multiplier):
#     raw ≈ 9*1 + 5*0.5 + 3*0.33 + ... ≈ 12-15
#   Setting ceiling=15 makes the scale meaningful:
#     - Very healthy product (avg risk ~1, 8 ingredients): raw ≈ 2.3  → ~15/100  (Low)
#     - Moderate product    (avg risk ~4, 8 ingredients): raw ≈ 9.3  → ~62/100  (Moderate)
#     - Unhealthy product   (avg risk ~7, 8 ingredients): raw ≈ 16.3 → ~100/100 (High, clamped)
#     - Nutella for Diabetic (sugar adj=9 at pos1):       raw ≈ 10.5 → ~70/100  (High) ✓
NORMALIZATION_CEILING = Decimal('15')

# Risk label thresholds
RISK_THRESHOLDS = {
    'low': Decimal('35'),       # 0-35:  Low risk
    'moderate': Decimal('65'),  # 36-65: Moderate risk
    # 66-100: High risk
}


class ParsedIngredient(TypedDict):
    """Shape of each item in the parse_ingredients_text() output."""
    position: int
    raw_token: str
    matched_ingredient_id: Optional[int]
    matched_name: Optional[str]
    category: Optional[str]
    base_risk_score: Optional[str]   # Decimal serialized as string
    allergen_flag: Optional[bool]


class ScoringResult(TypedDict):
    """Shape of the compute_score() output."""
    raw_score: str
    normalized_score: str
    risk_label: str
    has_allergen_warning: bool
    allergen_details: List[str]
    ingredient_breakdown: List[Dict[str, Any]]
    scored_result_id: int


# ---------------------------------------------------------------------------
# Token cleaning and ingredient lookup (Part 2)
# ---------------------------------------------------------------------------

def _clean_token(token: str) -> str:
    """
    Clean a raw ingredient token extracted from ingredients_text.

    Handles common patterns found in Open Food Facts data:
      - Parenthetical sub-ingredients: "Sugar (Cane)" -> "Sugar"
      - Percentage values: "Corn Grits (88%)" -> "Corn Grits"
      - Bracketed content: "Flour [Wheat]" -> "Flour"
      - Leading/trailing whitespace and punctuation
    """
    # Remove content inside parentheses or brackets
    cleaned = re.sub(r'\([^)]*\)', '', token)
    cleaned = re.sub(r'\[[^\]]*\]', '', cleaned)

    # Remove percentage patterns like "88%"
    cleaned = re.sub(r'\d+(\.\d+)?%', '', cleaned)

    # Remove leading/trailing whitespace, periods, asterisks, colons
    cleaned = cleaned.strip(' .*:;')

    return cleaned


def _lookup_ingredient(
    token: str,
    ingredient_by_name: Optional[Dict[str, Ingredient]] = None,
    ingredient_by_alias: Optional[Dict[str, Ingredient]] = None,
    ingredients_list: Optional[List[Ingredient]] = None,
    aliases_list: Optional[List[IngredientAlias]] = None
) -> Optional[Ingredient]:
    """
    Case-insensitive lookup of a token against Ingredient.name
    and IngredientAlias.alias_name. Returns the matched Ingredient or None.

    Strategy:
      1. Exact name match (case-insensitive)
      2. Exact alias match (case-insensitive)
      3. Partial/contains match on name (for sub-strings like
         "Corn Syrup Solids" matching "Corn Syrup" alias of HFCS)
    """
    normalized = token.strip().lower()

    if not normalized:
        return None

    # 1. Exact match on canonical name
    if ingredient_by_name is not None:
        if normalized in ingredient_by_name:
            return ingredient_by_name[normalized]
    else:
        ingredient = Ingredient.objects.filter(name__iexact=normalized).first()
        if ingredient:
            return ingredient

    # 2. Exact match on alias
    if ingredient_by_alias is not None:
        if normalized in ingredient_by_alias:
            return ingredient_by_alias[normalized]
    else:
        alias = IngredientAlias.objects.filter(
            alias_name__iexact=normalized
        ).select_related('ingredient').first()
        if alias:
            return alias.ingredient

    # 3. Partial match: check if any known ingredient name or alias
    #    is a substring OF the token (e.g., token "Corn Syrup Solids"
    #    contains alias "Corn Syrup"). We do NOT match the reverse
    #    (token "acid" being a substring of "Citric Acid") to avoid
    #    false positives with short generic words.
    #    Minimum token length of 4 prevents noisy short-word matches.
    if len(normalized) < 4:
        return None

    candidates = []

    # Check if token contains a known ingredient name
    if ingredients_list is not None:
        for ing in ingredients_list:
            ing_lower = ing.name.lower()
            if ing_lower in normalized:
                candidates.append((len(ing.name), ing))
    else:
        for ing in Ingredient.objects.all():
            ing_lower = ing.name.lower()
            if ing_lower in normalized:
                candidates.append((len(ing.name), ing))

    # Check if token contains a known alias
    if aliases_list is not None:
        for alias_obj in aliases_list:
            alias_lower = alias_obj.alias_name.lower()
            if alias_lower in normalized:
                candidates.append((len(alias_obj.alias_name), alias_obj.ingredient))
    else:
        for alias_obj in IngredientAlias.objects.select_related('ingredient').all():
            alias_lower = alias_obj.alias_name.lower()
            if alias_lower in normalized:
                candidates.append((len(alias_obj.alias_name), alias_obj.ingredient))

    if candidates:
        # Return the longest match (most specific)
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

    return None


def parse_ingredients_text(raw_text: str) -> List[ParsedIngredient]:
    """
    Parse a comma-separated ingredients string into a list of matched
    and unmatched ingredient records.

    Args:
        raw_text: The ingredients_text from Open Food Facts or OCR.
                  e.g., "Corn Grits, Sugar, Salt, Malt Flavor, BHA"

    Returns:
        A list of ParsedIngredient dicts preserving position order.
        Unmatched tokens have matched_ingredient_id=None.
    """
    if not raw_text or not raw_text.strip():
        return []

    # Pre-fetch all ingredients and aliases once to avoid N+1 queries in the loop
    ingredients_list = list(Ingredient.objects.all())
    aliases_list = list(IngredientAlias.objects.select_related('ingredient').all())

    # Build dictionaries for O(1) exact match lookups
    ingredient_by_name = {ing.name.lower(): ing for ing in ingredients_list}
    ingredient_by_alias = {alias.alias_name.lower(): alias.ingredient for alias in aliases_list}

    # Split on commas (primary separator in OFF data)
    raw_tokens = raw_text.split(',')

    results: List[ParsedIngredient] = []

    for position_index, raw_token in enumerate(raw_tokens):
        raw_token = raw_token.strip()

        if not raw_token:
            continue

        position = position_index + 1  # 1-indexed
        cleaned = _clean_token(raw_token)

        if not cleaned:
            # Token was entirely parenthetical/empty after cleaning
            results.append({
                'position': position,
                'raw_token': raw_token,
                'matched_ingredient_id': None,
                'matched_name': None,
                'category': None,
                'base_risk_score': None,
                'allergen_flag': None,
            })
            continue

        ingredient = _lookup_ingredient(
            cleaned,
            ingredient_by_name=ingredient_by_name,
            ingredient_by_alias=ingredient_by_alias,
            ingredients_list=ingredients_list,
            aliases_list=aliases_list
        )

        if ingredient:
            results.append({
                'position': position,
                'raw_token': raw_token,
                'matched_ingredient_id': ingredient.id,
                'matched_name': ingredient.name,
                'category': ingredient.category,
                'base_risk_score': str(ingredient.base_risk_score),
                'allergen_flag': ingredient.allergen_flag,
            })
        else:
            results.append({
                'position': position,
                'raw_token': raw_token,
                'matched_ingredient_id': None,
                'matched_name': None,
                'category': None,
                'base_risk_score': None,
                'allergen_flag': None,
            })

    return results


# ---------------------------------------------------------------------------
# Scoring Engine (Parts 3 & 4)
# ---------------------------------------------------------------------------

def get_adjusted_score(
    ingredient: Ingredient,
    profile,
    multipliers_map: Optional[Dict[tuple, Decimal]] = None
) -> Decimal:
    """
    Compute the severity-aware adjusted risk score for an ingredient
    given a user's health profile.

    Formula (exactly as specified in Part 4):
        For each condition on the profile that has a matching
        ConditionMultiplier rule for this ingredient's category:
            severity_weight = SEVERITY_WEIGHT[condition.severity]
            effective = 1 + (multiplier_value - 1) * severity_weight

        Take the MAX effective multiplier (never stacked across conditions).
        adjusted = base_risk_score * best_multiplier, clamped to [0, 10].

    If no conditions match, returns base_risk_score unchanged.

    Worked example from spec:
        Sugar (base=6), Diabetes->sweetener multiplier=1.50, severity=moderate
        effective = 1 + (1.50 - 1) * 1.0 = 1.50
        adjusted = 6 * 1.50 = 9.0

    Args:
        ingredient: An Ingredient model instance.
        profile: A HealthProfile model instance (with .conditions related manager).
        multipliers_map: Optional dictionary of pre-fetched multipliers ((cond_name, category) -> value)

    Returns:
        Decimal: The adjusted risk score, clamped to 0-10.
    """
    base = ingredient.base_risk_score
    effective_multipliers = []

    conditions = list(profile.conditions.all())
    for condition in conditions:
        if multipliers_map is not None:
            multiplier_value = multipliers_map.get((condition.condition_name, ingredient.category))
        else:
            rule = ConditionMultiplier.objects.filter(
                condition_name=condition.condition_name,
                ingredient_category=ingredient.category,
            ).first()
            multiplier_value = rule.multiplier_value if rule else None

        if multiplier_value is not None:
            severity_weight = SEVERITY_WEIGHT.get(
                condition.severity, Decimal('1.0')
            )
            effective = Decimal('1') + (
                multiplier_value - Decimal('1')
            ) * severity_weight
            effective_multipliers.append(effective)

    if not effective_multipliers:
        return base

    # Max across conditions, never stacked
    best_multiplier = max(effective_multipliers)
    adjusted = base * best_multiplier

    # Clamp to 0-10
    return min(adjusted, Decimal('10'))


def _get_risk_label(normalized_score: Decimal) -> str:
    """Map a 0-100 normalized score to a human-readable risk label."""
    if normalized_score <= RISK_THRESHOLDS['low']:
        return 'Low'
    elif normalized_score <= RISK_THRESHOLDS['moderate']:
        return 'Moderate'
    else:
        return 'High'


def compute_score(ingredient_inputs, profile, product_meta=None):
    """
    Compute the personalized health risk score for a list of ingredients
    against a health profile. Persists the full breakdown.

    Formula:
        position_weight = 1 / position
        ingredient_impact = adjusted_score * position_weight
        raw_score = sum(ingredient_impact)
        normalized_score = (raw_score / NORMALIZATION_CEILING) * 100, clamped to [0, 100]

    Allergen check is separate and unconditional: if ingredient.allergen_flag
    matches any allergy on the profile, has_allergen_warning = True.

    Args:
        ingredient_inputs: List of dicts with 'ingredient_id' and 'position'.
            e.g., [{"ingredient_id": 12, "position": 2}, ...]
        profile: A HealthProfile model instance.

    Returns:
        ScoringResult dict with full breakdown.
    """
    # Gather profile allergies for allergen checking
    profile_allergies = set(
        profile.allergies.values_list('allergen_name', flat=True)
    )
    profile_allergy_lower = {a.lower() for a in profile_allergies}

    # Pre-fetch all multiplier rules for the profile's conditions in one query
    condition_names = [cond.condition_name for cond in profile.conditions.all()]
    multipliers = ConditionMultiplier.objects.filter(condition_name__in=condition_names)
    multipliers_map = {
        (m.condition_name, m.ingredient_category): m.multiplier_value
        for m in multipliers
    }

    # Pre-fetch all Ingredients and their Aliases in one query to avoid N+1 queries inside loop
    ingredient_ids = [item.get('ingredient_id') for item in ingredient_inputs if item.get('ingredient_id')]
    ingredients_db = Ingredient.objects.filter(id__in=ingredient_ids).prefetch_related('aliases')
    ingredients_map = {ing.id: ing for ing in ingredients_db}

    raw_score = Decimal('0')
    ingredient_breakdown = []
    allergen_triggers = []
    scored_details = []  # For bulk DB creation

    for item in ingredient_inputs:
        ingredient_id = item.get('ingredient_id')
        position = item.get('position', 1)
        raw_token = item.get('raw_token', '')

        if not ingredient_id:
            # Unmatched ingredient — contributes 0 to score
            ingredient_breakdown.append({
                'position': position,
                'raw_token': raw_token,
                'matched_name': None,
                'base_risk_score': '0.00',
                'adjusted_score': '0.00',
                'position_weight': str(
                    (Decimal('1') / Decimal(str(position))).quantize(
                        Decimal('0.0001'), rounding=ROUND_HALF_UP
                    )
                ),
                'ingredient_impact': '0.0000',
                'is_allergen_trigger': False,
            })
            scored_details.append({
                'ingredient_id': None,
                'raw_token': raw_token,
                'position': position,
                'base_risk_score': Decimal('0'),
                'adjusted_score': Decimal('0'),
                'position_weight': Decimal('1') / Decimal(str(position)),
                'ingredient_impact': Decimal('0'),
                'is_allergen_trigger': False,
            })
            continue

        ingredient = ingredients_map.get(ingredient_id)
        if not ingredient:
            # Invalid ingredient_id — skip
            continue

        # Compute adjusted score (severity-aware personalization) using pre-fetched multipliers map
        base = ingredient.base_risk_score
        adjusted = get_adjusted_score(ingredient, profile, multipliers_map=multipliers_map)

        # Position weight
        pos_weight = Decimal('1') / Decimal(str(position))

        # Impact
        impact = adjusted * pos_weight

        # Accumulate
        raw_score += impact

        # Allergen check — independent of score
        is_allergen = False
        if ingredient.allergen_flag:
            # Check if ingredient name or any of its aliases match a profile allergy
            ingredient_names_lower = {ingredient.name.lower()}
            for alias in ingredient.aliases.all():
                ingredient_names_lower.add(alias.alias_name.lower())

            if ingredient_names_lower & profile_allergy_lower:
                is_allergen = True
                allergen_triggers.append(ingredient.name)

        ingredient_breakdown.append({
            'position': position,
            'raw_token': raw_token,
            'matched_name': ingredient.name,
            'category': ingredient.category,
            'base_risk_score': str(base.quantize(Decimal('0.01'))),
            'adjusted_score': str(adjusted.quantize(Decimal('0.01'))),
            'position_weight': str(pos_weight.quantize(Decimal('0.0001'))),
            'ingredient_impact': str(impact.quantize(Decimal('0.0001'))),
            'is_allergen_trigger': is_allergen,
        })

        scored_details.append({
            'ingredient_id': ingredient_id,
            'raw_token': raw_token,
            'position': position,
            'base_risk_score': base,
            'adjusted_score': adjusted,
            'position_weight': pos_weight,
            'ingredient_impact': impact,
            'is_allergen_trigger': is_allergen,
        })

    # Normalize raw_score to 0-100
    if raw_score <= 0:
        normalized = Decimal('0')
    else:
        normalized = (raw_score / NORMALIZATION_CEILING) * Decimal('100')
        normalized = min(normalized, Decimal('100'))

    normalized = normalized.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    risk_label = _get_risk_label(normalized)

    has_allergen_warning = len(allergen_triggers) > 0

    # Persist the scored result
    meta = product_meta or {}
    scored_result = ScoredResult.objects.create(
        profile=profile,
        raw_score=raw_score.quantize(Decimal('0.0001')),
        normalized_score=normalized,
        has_allergen_warning=has_allergen_warning,
        allergen_details=allergen_triggers,
        risk_label=risk_label,
        barcode=meta.get('barcode', ''),
        product_name=meta.get('product_name', ''),
        product_image_url=meta.get('product_image_url', ''),
        nutrition_data=meta.get('nutrition_data', {}),
    )

    # Persist per-ingredient details
    detail_objects = []
    for detail in scored_details:
        detail_objects.append(ScoredIngredientDetail(
            scored_result=scored_result,
            ingredient_id=detail['ingredient_id'],
            raw_token=detail['raw_token'],
            position=detail['position'],
            base_risk_score=detail['base_risk_score'],
            adjusted_score=detail['adjusted_score'],
            position_weight=detail['position_weight'],
            ingredient_impact=detail['ingredient_impact'],
            is_allergen_trigger=detail['is_allergen_trigger'],
        ))
    ScoredIngredientDetail.objects.bulk_create(detail_objects)

    return {
        'raw_score': str(raw_score.quantize(Decimal('0.0001'))),
        'normalized_score': str(normalized),
        'risk_label': risk_label,
        'has_allergen_warning': has_allergen_warning,
        'allergen_details': allergen_triggers,
        'ingredient_breakdown': ingredient_breakdown,
        'scored_result_id': scored_result.id,
    }

