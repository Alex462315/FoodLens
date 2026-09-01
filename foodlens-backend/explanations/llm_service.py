"""
Explanations app — LLM Service Module.

This module wraps ALL LLM (Gemini) interactions behind a single function.
No LLM calls exist anywhere else in the codebase — this is the only place.

Architecture rule (non-negotiable):
    The LLM NEVER determines a risk score, allergen status, severity, or
    any health claim. Its ONLY job is to take already-computed ScoredResult +
    ScoredIngredientDetail data and rephrase it into a plain-language paragraph.
    Every fact in the output must be traceable back to a field that already
    exists in the database before the LLM is called.
"""
import os
import logging

from google import genai
from google.genai import types

from scoring.models import ScoredResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Model to use — gemini-3.5-flash is stable, fast, cheap, and produces
# excellent plain-language explanations from structured data.
GEMINI_MODEL = 'gemini-3.5-flash'


class ExplanationError(Exception):
    """Raised when the LLM call fails for any reason."""
    pass


class APIKeyMissingError(ExplanationError):
    """Raised when the GEMINI_API_KEY environment variable is not set."""
    pass


# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

SYSTEM_INSTRUCTION = """\
You are FoodLens AI, a health-aware food explanation assistant.

YOUR ONLY JOB: Take the pre-computed ingredient scoring data provided below \
and rephrase it into a clear, empathetic, plain-language paragraph that a \
non-technical user can understand.

STRICT RULES — VIOLATION OF ANY RULE IS UNACCEPTABLE:
1. Do NOT add any health claims, diagnoses, or medical advice not present in the data.
2. Do NOT suggest alternative products or brands.
3. Do NOT estimate, infer, or guess anything not explicitly given to you.
4. Do NOT invent ingredient risks, percentages, or facts.
5. Do NOT say "consult a doctor" or give any medical directive.
6. Every single fact you mention MUST come directly from the data below.
7. Keep the tone friendly, clear, and empathetic — not alarming or clinical.
8. Write exactly ONE paragraph of 3–5 sentences.
9. If an allergen warning is present, mention it prominently and clearly.
10. Refer to the user's health conditions by name when explaining why certain \
    ingredients scored higher.
"""


def _build_user_prompt(scored_result: ScoredResult) -> str:
    """
    Build the user-facing prompt containing ONLY pre-computed data
    from the ScoredResult and its related ScoredIngredientDetail rows.

    Every field referenced here already exists in the database —
    the LLM is not asked to compute or infer anything.
    """
    # Gather profile info
    profile = scored_result.profile
    conditions = list(profile.conditions.all())
    allergies = list(profile.allergies.all())

    condition_text = ', '.join(
        f"{c.condition_name} ({c.severity})" for c in conditions
    ) if conditions else 'None'

    allergy_text = ', '.join(
        a.allergen_name for a in allergies
    ) if allergies else 'None'

    # Gather ingredient breakdown
    details = scored_result.ingredient_details.select_related('ingredient').all()

    ingredient_lines = []
    for d in details:
        name = d.ingredient.name if d.ingredient else d.raw_token
        category = d.ingredient.category if d.ingredient else 'unknown'
        line = (
            f"  - Position {d.position}: \"{name}\" "
            f"(category: {category}, "
            f"base risk: {d.base_risk_score}/10, "
            f"adjusted risk: {d.adjusted_score}/10, "
            f"position weight: {d.position_weight}, "
            f"impact: {d.ingredient_impact})"
        )
        if d.is_allergen_trigger:
            line += " ⚠️ ALLERGEN MATCH"
        ingredient_lines.append(line)

    ingredients_block = '\n'.join(ingredient_lines) if ingredient_lines else '  (no matched ingredients)'

    # Risk label
    risk_label = scored_result.risk_label or 'Unknown'
    normalized = scored_result.normalized_score

    # Allergen info
    allergen_warning = "YES" if scored_result.has_allergen_warning else "NO"
    allergen_names = ', '.join(scored_result.allergen_details) if scored_result.allergen_details else 'None'

    prompt = f"""\
Here is the pre-computed scoring data for a scanned food product:

PROFILE:
  Name: {profile.profile_name}
  Health Conditions: {condition_text}
  Allergies: {allergy_text}

OVERALL RESULT:
  Normalized Risk Score: {normalized}/100
  Risk Level: {risk_label}
  Allergen Warning: {allergen_warning}
  Triggered Allergens: {allergen_names}

INGREDIENT BREAKDOWN (ordered by position — first ingredient = highest quantity):
{ingredients_block}

Based ONLY on the data above, write a single paragraph explaining this product's \
health risk score to the user. If there is an allergen warning, mention it clearly \
and prominently. Explain why certain ingredients contributed more to the score \
(referencing their health conditions if applicable). Keep it friendly and concise.
"""
    return prompt


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def generate_explanation(scored_result: ScoredResult) -> str:
    """
    Generate a plain-language explanation for a ScoredResult using Gemini.

    This function:
      1. Gathers ONLY pre-computed data from the ScoredResult + details.
      2. Constructs a constrained prompt forbidding new health claims.
      3. Calls the Gemini API.
      4. Returns the plain-language text.

    The caller is responsible for saving the result to the Explanation model.

    Args:
        scored_result: A ScoredResult instance (must have related
                       ingredient_details, profile with conditions/allergies).

    Returns:
        str: The LLM-generated explanation text.

    Raises:
        APIKeyMissingError: If GEMINI_API_KEY is not set in the environment.
        ExplanationError: If the LLM call fails for any reason (timeout,
                         rate limit, invalid key, empty response, etc.).
    """
    # Check API key
    api_key = os.getenv('GEMINI_API_KEY', '')
    if not api_key:
        raise APIKeyMissingError(
            'GEMINI_API_KEY is not set. Add it to your .env file:\n'
            '  GEMINI_API_KEY=your_api_key_here\n'
            'Get a free key at: https://aistudio.google.com/app/apikey'
        )

    # Build the prompt from pre-computed data only
    user_prompt = _build_user_prompt(scored_result)

    logger.info(
        'Generating explanation for ScoredResult #%d (model: %s)',
        scored_result.id, GEMINI_MODEL,
    )

    try:
        # Initialize the client with the API key
        client = genai.Client(api_key=api_key)

        # Call the model
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.4,        # Low temperature for factual rephrasing
                max_output_tokens=500,   # Keep explanations concise
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )

        # Validate response
        if not response or not response.text:
            raise ExplanationError(
                'Gemini returned an empty response. The model may have '
                'refused the request or encountered a content filter.'
            )

        explanation_text = response.text.strip()

        logger.info(
            'Successfully generated explanation for ScoredResult #%d (%d chars)',
            scored_result.id, len(explanation_text),
        )

        return explanation_text

    except APIKeyMissingError:
        raise  # Re-raise without wrapping

    except Exception as e:
        logger.error(
            'Failed to generate explanation for ScoredResult #%d: %s',
            scored_result.id, str(e),
        )
        raise ExplanationError(
            f'Could not generate explanation: {str(e)}'
        ) from e
