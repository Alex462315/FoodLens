"""
Scoring app — Unit tests for the scoring engine.

Three hand-verified test cases as required by the spec:
  1. Basic scoring (no conditions) — pure position-weighted base_risk_score
  2. Severity-aware personalization — Diabetes (moderate) on sweeteners
  3. Multi-condition max-not-stacked + allergen override

Each test includes a worked example with exact expected values.
"""
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from health.models import HealthProfile, HealthCondition, Allergy
from scoring.models import (
    Ingredient, IngredientAlias, ConditionMultiplier,
    ScoredResult, ScoredIngredientDetail,
)
from scoring.engine import (
    get_adjusted_score, compute_score,
    SEVERITY_WEIGHT, NORMALIZATION_CEILING,
)


class ScoringEngineBaseTestCase(TestCase):
    """Shared setup: create user, seed a few ingredients and multipliers."""

    @classmethod
    def setUpTestData(cls):
        # Create test user
        cls.user = User.objects.create_user(
            username='testuser', password='TestPass123'
        )

        # Seed ingredients
        cls.sugar = Ingredient.objects.create(
            name='Sugar', category='sweetener',
            base_risk_score=Decimal('6.00'), allergen_flag=False,
            source_reference='Test',
        )
        cls.hfcs = Ingredient.objects.create(
            name='High Fructose Corn Syrup', category='sweetener',
            base_risk_score=Decimal('7.50'), allergen_flag=False,
            source_reference='Test',
        )
        cls.salt = Ingredient.objects.create(
            name='Salt', category='sodium_containing',
            base_risk_score=Decimal('5.00'), allergen_flag=False,
            source_reference='Test',
        )
        cls.bha = Ingredient.objects.create(
            name='BHA', category='preservative',
            base_risk_score=Decimal('7.00'), allergen_flag=False,
            source_reference='Test',
        )
        cls.peanuts = Ingredient.objects.create(
            name='Peanuts', category='natural',
            base_risk_score=Decimal('1.50'), allergen_flag=True,
            source_reference='Test',
        )
        cls.palm_oil = Ingredient.objects.create(
            name='Palm Oil', category='fat',
            base_risk_score=Decimal('5.50'), allergen_flag=False,
            source_reference='Test',
        )
        cls.turmeric = Ingredient.objects.create(
            name='Turmeric', category='natural',
            base_risk_score=Decimal('0.50'), allergen_flag=False,
            source_reference='Test',
        )

        # Seed multiplier rules
        ConditionMultiplier.objects.create(
            condition_name='Diabetes',
            ingredient_category='sweetener',
            multiplier_value=Decimal('1.50'),
        )
        ConditionMultiplier.objects.create(
            condition_name='Hypertension',
            ingredient_category='sodium_containing',
            multiplier_value=Decimal('1.40'),
        )
        ConditionMultiplier.objects.create(
            condition_name='Obesity',
            ingredient_category='fat',
            multiplier_value=Decimal('1.30'),
        )
        ConditionMultiplier.objects.create(
            condition_name='Obesity',
            ingredient_category='sweetener',
            multiplier_value=Decimal('1.20'),
        )


class TestBasicScoring(ScoringEngineBaseTestCase):
    """
    Test 1: Basic scoring with NO health conditions.
    adjusted_score = base_risk_score (no multiplier applies).

    Ingredient list: Sugar(pos=1), Salt(pos=2), BHA(pos=3), Turmeric(pos=4)

    Worked example:
        Sugar:    6.00 * (1/1) = 6.0000
        Salt:     5.00 * (1/2) = 2.5000
        BHA:      7.00 * (1/3) = 2.3333
        Turmeric: 0.50 * (1/4) = 0.1250
        ---------------------------------
        raw_score = 10.9583

        normalized = (10.9583 / 25) * 100 = 43.83
        risk_label = "Moderate" (between 35 and 65)
    """

    def test_basic_no_conditions(self):
        # Profile with no conditions, no allergies
        profile = HealthProfile.objects.create(
            user=self.user, profile_name='Test Basic',
            relation='self', age=25, gender='male',
        )

        ingredient_inputs = [
            {'ingredient_id': self.sugar.id, 'position': 1, 'raw_token': 'Sugar'},
            {'ingredient_id': self.salt.id, 'position': 2, 'raw_token': 'Salt'},
            {'ingredient_id': self.bha.id, 'position': 3, 'raw_token': 'BHA'},
            {'ingredient_id': self.turmeric.id, 'position': 4, 'raw_token': 'Turmeric'},
        ]

        result = compute_score(ingredient_inputs, profile)

        # Verify adjusted_score = base for each (no conditions)
        breakdown = result['ingredient_breakdown']
        self.assertEqual(breakdown[0]['adjusted_score'], '6.00')  # Sugar
        self.assertEqual(breakdown[1]['adjusted_score'], '5.00')  # Salt
        self.assertEqual(breakdown[2]['adjusted_score'], '7.00')  # BHA
        self.assertEqual(breakdown[3]['adjusted_score'], '0.50')  # Turmeric

        # Verify position weights
        self.assertEqual(breakdown[0]['position_weight'], '1.0000')  # 1/1
        self.assertEqual(breakdown[1]['position_weight'], '0.5000')  # 1/2

        # Verify raw_score (hand-calculated)
        # 6.0 + 2.5 + 2.3333 + 0.125 = 10.9583
        raw = Decimal(result['raw_score'])
        self.assertAlmostEqual(float(raw), 10.9583, places=2)

        # Verify normalized score
        # (10.9583 / 25) * 100 = 43.83
        normalized = Decimal(result['normalized_score'])
        self.assertAlmostEqual(float(normalized), 43.83, places=0)

        # Verify risk label
        self.assertEqual(result['risk_label'], 'Moderate')

        # No allergen warning
        self.assertFalse(result['has_allergen_warning'])
        self.assertEqual(result['allergen_details'], [])

        # Verify persistence
        self.assertTrue(ScoredResult.objects.filter(id=result['scored_result_id']).exists())
        details = ScoredIngredientDetail.objects.filter(
            scored_result_id=result['scored_result_id']
        )
        self.assertEqual(details.count(), 4)


class TestSeverityAwarePersonalization(ScoringEngineBaseTestCase):
    """
    Test 2: Severity-aware personalization — reproduces the EXACT worked
    example from Part 4 of the spec.

    Sugar (base=6), Diabetes->sweetener multiplier=1.50

    Moderate severity:
        effective = 1 + (1.50 - 1) * 1.0 = 1.50
        adjusted = 6 * 1.50 = 9.0

    Severe severity:
        effective = 1 + (1.50 - 1) * 1.5 = 1.75
        adjusted = 6 * 1.75 = 10.5 -> clamped to 10.0

    Mild severity:
        effective = 1 + (1.50 - 1) * 0.5 = 1.25
        adjusted = 6 * 1.25 = 7.5
    """

    def test_adjusted_score_moderate(self):
        """Sugar + Diabetes(moderate) -> adjusted = 9.0"""
        profile = HealthProfile.objects.create(
            user=self.user, profile_name='Test Moderate',
            relation='self', age=40, gender='male',
        )
        HealthCondition.objects.create(
            profile=profile,
            condition_name='Diabetes',
            severity='moderate',
        )

        adjusted = get_adjusted_score(self.sugar, profile)
        self.assertEqual(adjusted, Decimal('9.00'))

    def test_adjusted_score_severe(self):
        """Sugar + Diabetes(severe) -> adjusted = 10.5 -> clamped to 10.0"""
        profile = HealthProfile.objects.create(
            user=self.user, profile_name='Test Severe',
            relation='self', age=40, gender='male',
        )
        HealthCondition.objects.create(
            profile=profile,
            condition_name='Diabetes',
            severity='severe',
        )

        adjusted = get_adjusted_score(self.sugar, profile)
        self.assertEqual(adjusted, Decimal('10'))  # Clamped

    def test_adjusted_score_mild(self):
        """Sugar + Diabetes(mild) -> adjusted = 7.5"""
        profile = HealthProfile.objects.create(
            user=self.user, profile_name='Test Mild',
            relation='self', age=40, gender='male',
        )
        HealthCondition.objects.create(
            profile=profile,
            condition_name='Diabetes',
            severity='mild',
        )

        adjusted = get_adjusted_score(self.sugar, profile)
        self.assertEqual(adjusted, Decimal('7.500'))

    def test_full_score_with_diabetes_moderate(self):
        """
        Full scoring with Diabetes(moderate):
            Sugar(pos=1):  adjusted=9.0,  impact = 9.0 * 1/1 = 9.0000
            Salt(pos=2):   adjusted=5.0,  impact = 5.0 * 1/2 = 2.5000
            Turmeric(pos=3): adjusted=0.5, impact = 0.5 * 1/3 = 0.1667
            -------------------------------------------------------
            raw_score = 11.6667
            normalized = (11.6667 / 25) * 100 = 46.67
        """
        profile = HealthProfile.objects.create(
            user=self.user, profile_name='Test Diabetes',
            relation='self', age=40, gender='male',
        )
        HealthCondition.objects.create(
            profile=profile,
            condition_name='Diabetes',
            severity='moderate',
        )

        ingredient_inputs = [
            {'ingredient_id': self.sugar.id, 'position': 1, 'raw_token': 'Sugar'},
            {'ingredient_id': self.salt.id, 'position': 2, 'raw_token': 'Salt'},
            {'ingredient_id': self.turmeric.id, 'position': 3, 'raw_token': 'Turmeric'},
        ]

        result = compute_score(ingredient_inputs, profile)

        # Sugar adjusted by Diabetes multiplier
        breakdown = result['ingredient_breakdown']
        self.assertEqual(breakdown[0]['adjusted_score'], '9.00')  # 6 * 1.5
        self.assertEqual(breakdown[1]['adjusted_score'], '5.00')  # Salt unchanged
        self.assertEqual(breakdown[2]['adjusted_score'], '0.50')  # Turmeric unchanged

        normalized = Decimal(result['normalized_score'])
        self.assertAlmostEqual(float(normalized), 46.67, places=0)
        self.assertEqual(result['risk_label'], 'Moderate')


class TestMultiConditionAndAllergen(ScoringEngineBaseTestCase):
    """
    Test 3: Multi-condition (max, not stacked) + allergen override.

    Profile: Diabetes(moderate) + Obesity(moderate)
    Both have rules for sweetener: Diabetes=1.50, Obesity=1.20
    Should use MAX(1.50, 1.20) = 1.50, not stack them.

    Also: profile has Peanuts allergy, and Peanuts is in the ingredient list.
    Allergen warning should fire regardless of score.

    Ingredient list: Sugar(pos=1), Palm Oil(pos=2), Peanuts(pos=3)

    Sugar:    Diabetes->sweetener effective=1.50, Obesity->sweetener effective=1.20
              MAX = 1.50, adjusted = 6 * 1.5 = 9.0, impact = 9.0 * 1/1 = 9.0000
    Palm Oil: Obesity->fat effective=1.30, adjusted = 5.5 * 1.3 = 7.15
              impact = 7.15 * 1/2 = 3.5750
    Peanuts:  No multiplier for natural category, adjusted = 1.5
              impact = 1.5 * 1/3 = 0.5000
              allergen_flag=True, profile has "Peanuts" allergy -> TRIGGER
    ---
    raw_score = 9.0 + 3.575 + 0.5 = 13.075
    normalized = (13.075 / 25) * 100 = 52.30
    risk_label = "Moderate"
    has_allergen_warning = True
    """

    def test_multi_condition_max_not_stacked(self):
        profile = HealthProfile.objects.create(
            user=self.user, profile_name='Test Multi',
            relation='self', age=35, gender='female',
        )
        HealthCondition.objects.create(
            profile=profile, condition_name='Diabetes', severity='moderate',
        )
        HealthCondition.objects.create(
            profile=profile, condition_name='Obesity', severity='moderate',
        )
        Allergy.objects.create(
            profile=profile, allergen_name='Peanuts',
        )

        # Verify Sugar uses MAX multiplier, not stacked
        adjusted_sugar = get_adjusted_score(self.sugar, profile)
        self.assertEqual(adjusted_sugar, Decimal('9.00'))  # MAX(1.5, 1.2) * 6

        # Verify Palm Oil uses Obesity multiplier
        adjusted_palm = get_adjusted_score(self.palm_oil, profile)
        self.assertEqual(adjusted_palm, Decimal('7.150'))  # 5.5 * 1.3

        # Full scoring
        ingredient_inputs = [
            {'ingredient_id': self.sugar.id, 'position': 1, 'raw_token': 'Sugar'},
            {'ingredient_id': self.palm_oil.id, 'position': 2, 'raw_token': 'Palm Oil'},
            {'ingredient_id': self.peanuts.id, 'position': 3, 'raw_token': 'Peanuts'},
        ]

        result = compute_score(ingredient_inputs, profile)

        breakdown = result['ingredient_breakdown']

        # Sugar: adjusted=9.00 (max of Diabetes 1.5 and Obesity 1.2)
        self.assertEqual(breakdown[0]['adjusted_score'], '9.00')
        self.assertEqual(breakdown[0]['is_allergen_trigger'], False)

        # Palm Oil: adjusted=7.15 (Obesity fat multiplier 1.3)
        self.assertEqual(breakdown[1]['adjusted_score'], '7.15')

        # Peanuts: adjusted=1.50 (no multiplier), but allergen triggered
        self.assertEqual(breakdown[2]['adjusted_score'], '1.50')
        self.assertEqual(breakdown[2]['is_allergen_trigger'], True)

        # Verify allergen warning fires
        self.assertTrue(result['has_allergen_warning'])
        self.assertIn('Peanuts', result['allergen_details'])

        # Verify overall score
        raw = Decimal(result['raw_score'])
        self.assertAlmostEqual(float(raw), 13.075, places=1)

        normalized = Decimal(result['normalized_score'])
        self.assertAlmostEqual(float(normalized), 52.30, places=0)
        self.assertEqual(result['risk_label'], 'Moderate')

        # Verify persistence
        scored = ScoredResult.objects.get(id=result['scored_result_id'])
        self.assertTrue(scored.has_allergen_warning)
        self.assertEqual(scored.ingredient_details.count(), 3)

    def test_allergen_warning_with_low_score(self):
        """
        Allergen warning must fire even when the overall score is Low.
        Product: just Peanuts (pos=1) -> score = 1.5/25 * 100 = 6.00 (Low)
        But allergen warning should still be True.
        """
        profile = HealthProfile.objects.create(
            user=self.user, profile_name='Test Allergen Only',
            relation='self', age=25, gender='male',
        )
        Allergy.objects.create(profile=profile, allergen_name='Peanuts')

        ingredient_inputs = [
            {'ingredient_id': self.peanuts.id, 'position': 1, 'raw_token': 'Peanuts'},
        ]

        result = compute_score(ingredient_inputs, profile)

        # Score should be low
        self.assertEqual(result['risk_label'], 'Low')

        # But allergen warning MUST still fire
        self.assertTrue(result['has_allergen_warning'])
        self.assertIn('Peanuts', result['allergen_details'])
