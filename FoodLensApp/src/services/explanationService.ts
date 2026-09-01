/**
 * FoodLens Services — Explanation API calls
 *
 * Two endpoints:
 *   1. generateExplanation() — generate or retrieve cached AI explanation
 *   2. submitFeedback()      — submit thumbs-up/down feedback
 */

import apiClient from './apiClient';

// ---------- Types ----------

export interface ExplanationResponse {
  id: number;
  scored_result_id: number;
  explanation_text: string;
  llm_model_used: string;
  generated_at: string;
}

export interface FeedbackResponse {
  explanation_id: number;
  is_helpful: boolean;
}

// ---------- API Calls ----------

/**
 * Generate (or retrieve cached) AI explanation for a scored result.
 * Returns HTTP 200 if cached, 201 if freshly generated.
 */
export const generateExplanation = async (
  scoredResultId: number,
): Promise<ExplanationResponse> => {
  const response = await apiClient.post<ExplanationResponse>(
    '/explanations/generate/',
    {scored_result_id: scoredResultId},
  );
  return response.data;
};

/**
 * Submit thumbs-up/down feedback on an explanation.
 * Creates or updates the user's feedback (one vote per user per explanation).
 */
export const submitFeedback = async (
  explanationId: number,
  isHelpful: boolean,
): Promise<FeedbackResponse> => {
  const response = await apiClient.post<FeedbackResponse>(
    `/explanations/${explanationId}/feedback/`,
    {is_helpful: isHelpful},
  );
  return response.data;
};
