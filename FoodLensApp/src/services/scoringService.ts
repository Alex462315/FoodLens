/**
 * FoodLens Services — Scoring API calls
 *
 * Two-step flow:
 *   1. parseIngredients() — send raw_text, get matched/unmatched list
 *   2. computeScore()     — send matched ingredients + profile_id, get personalized score
 */

import apiClient from './apiClient';

// ---------- Parse Ingredients ----------

export interface ParsedIngredient {
  position: number;
  raw_token: string;
  matched_ingredient_id: number | null;
  matched_name: string | null;
  category: string | null;
  base_risk_score: string | null;
  allergen_flag: boolean | null;
}

export interface ParseIngredientsResponse {
  raw_text: string;
  total_tokens: number;
  matched_count: number;
  unmatched_count: number;
  ingredients: ParsedIngredient[];
}

/**
 * Parse a raw ingredients text string into matched/unmatched ingredients.
 */
export const parseIngredients = async (
  rawText: string,
): Promise<ParseIngredientsResponse> => {
  const response = await apiClient.post<ParseIngredientsResponse>(
    '/scoring/parse-ingredients/',
    {raw_text: rawText},
  );
  return response.data;
};

// ---------- Compute Score ----------

export interface IngredientInput {
  ingredient_id: number | null;
  position: number;
  raw_token: string;
}

export interface IngredientBreakdown {
  position: number;
  raw_token: string;
  matched_name: string | null;
  category?: string;
  base_risk_score: string;
  adjusted_score: string;
  position_weight: string;
  ingredient_impact: string;
  is_allergen_trigger: boolean;
}

export interface ComputeScoreResponse {
  raw_score: string;
  normalized_score: string;
  risk_label: 'Low' | 'Moderate' | 'High';
  has_allergen_warning: boolean;
  allergen_details: string[];
  ingredient_breakdown: IngredientBreakdown[];
  scored_result_id: number;
}

export interface ProductMeta {
  barcode?: string;
  product_name?: string;
  product_image_url?: string;
  nutrition?: Record<string, number | null>;
}

/**
 * Compute the personalized health risk score.
 */
export const computeScore = async (
  ingredients: IngredientInput[],
  profileId: number,
  productMeta?: ProductMeta,
): Promise<ComputeScoreResponse> => {
  const response = await apiClient.post<ComputeScoreResponse>(
    '/scoring/compute/',
    {
      ingredients,
      profile_id: profileId,
      barcode: productMeta?.barcode || '',
      product_name: productMeta?.product_name || '',
      product_image_url: productMeta?.product_image_url || '',
      nutrition: productMeta?.nutrition || {},
    },
  );
  return response.data;
};

// ---------- Convenience: Full Pipeline ----------

/**
 * End-to-end convenience: parse raw text + compute score in one call.
 * Returns null if no ingredients text or no profile.
 */
export const scoreProduct = async (
  ingredientsText: string,
  profileId: number,
  productMeta?: ProductMeta,
): Promise<ComputeScoreResponse | null> => {
  if (!ingredientsText || !ingredientsText.trim()) {
    return null;
  }

  // Step 1: Parse
  const parsed = await parseIngredients(ingredientsText);

  if (parsed.ingredients.length === 0) {
    return null;
  }

  // Step 2: Convert parsed output to compute input
  const ingredientInputs: IngredientInput[] = parsed.ingredients.map(ing => ({
    ingredient_id: ing.matched_ingredient_id,
    position: ing.position,
    raw_token: ing.raw_token,
  }));

  // Step 3: Compute
  const result = await computeScore(ingredientInputs, profileId, productMeta);
  return result;
};

// ---------- Scan History ----------

export interface ScanHistoryItem {
  id: number;
  barcode: string;
  product_name: string;
  product_image_url: string;
  normalized_score: string;
  risk_label: 'Low' | 'Moderate' | 'High';
  has_allergen_warning: boolean;
  allergen_details: string[];
  nutrition_data?: Record<string, number>;
  ingredient_breakdown?: Array<{
    original_name: string;
    matched_name: string | null;
    category: string | null;
    position: number;
    adjusted_risk_score: number;
  }>;
  created_at: string;
}

/**
 * Fetch the user's scan history (last 50 scans, newest first).
 */
export const getScanHistory = async (): Promise<ScanHistoryItem[]> => {
  const response = await apiClient.get<ScanHistoryItem[]>('/scoring/history/');
  return response.data;
};

/**
 * Fetch full detail for a single scan (nutrition + ingredient breakdown).
 */
export const getScanDetail = async (id: number): Promise<ScanHistoryItem> => {
  const response = await apiClient.get<ScanHistoryItem>(`/scoring/history/${id}/`);
  return response.data;
};
