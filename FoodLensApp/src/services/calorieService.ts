/**
 * calorieService.ts — Calorie tracking API calls
 *
 * Endpoints:
 *   - GET/POST calorie goal
 *   - GET/POST/DELETE manual food entries
 *   - GET daily calorie summary
 *   - POST analyze food photo (Gemini Vision)
 *   - GET calorie check for a scanned product
 */

import apiClient from './apiClient';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CalorieGoal {
  daily_goal_kcal: number;
}

export interface ManualFoodEntry {
  id?: number;
  food_name: string;
  calories_kcal: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  serving_description?: string;
  source?: 'manual' | 'photo';
  notes?: string;
  logged_at?: string; // YYYY-MM-DD
}

export interface DailyCalorieSummary {
  date: string;
  goal_kcal: number;
  manual_kcal: number;
  scanned_kcal: number;
  total_consumed_kcal: number;
  remaining_kcal: number;
  exceeded: boolean;
  pct_used: number;
  manual_entries: Array<{
    id: number;
    food_name: string;
    calories_kcal: number;
    serving_description: string;
    source: string;
  }>;
}

export interface PhotoFoodAnalysis {
  food_name: string;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  serving_description: string;
  confidence: 'high' | 'medium' | 'low';
  error?: string;
}

export interface CalorieCheckResult {
  product_kcal: number;
  goal_kcal: number;
  consumed_kcal: number;
  remaining_kcal: number;
  fits: boolean;
  message: string;
  status: 'ok' | 'warning' | 'exceeded';
}

// ─── API Functions ──────────────────────────────────────────────────────────

/** Get the user's current daily calorie goal */
export const getCalorieGoal = async (): Promise<CalorieGoal> => {
  const res = await apiClient.get<CalorieGoal>('/scoring/calorie-goal/');
  return res.data;
};

/** Set or update the user's daily calorie goal */
export const setCalorieGoal = async (daily_goal_kcal: number): Promise<CalorieGoal> => {
  const res = await apiClient.post<CalorieGoal>('/scoring/calorie-goal/', { daily_goal_kcal });
  return res.data;
};

/** Get the daily calorie summary (consumed + remaining + entries) */
export const getDailyCalorieSummary = async (date?: string): Promise<DailyCalorieSummary> => {
  const params = date ? `?date=${date}` : '';
  const res = await apiClient.get<DailyCalorieSummary>(`/scoring/daily-calorie-summary/${params}`);
  return res.data;
};

/** Log a new manual food entry */
export const logFoodEntry = async (entry: ManualFoodEntry): Promise<ManualFoodEntry> => {
  const res = await apiClient.post<ManualFoodEntry>('/scoring/food-entries/', entry);
  return res.data;
};

/** Delete a food entry by ID */
export const deleteFoodEntry = async (id: number): Promise<void> => {
  await apiClient.delete(`/scoring/food-entries/${id}/`);
};

/**
 * Analyze a food photo using Gemini Vision API.
 * Pass the base64-encoded image string (without data:... prefix).
 */
export const analyzeFoodPhoto = async (
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<PhotoFoodAnalysis> => {
  const res = await apiClient.post<PhotoFoodAnalysis>('/scoring/analyze-food-photo/', {
    image_base64: imageBase64,
    mime_type: mimeType,
  });
  return res.data;
};

/**
 * Check if a product's calories fit within the user's remaining daily intake.
 * Pass the product's calories in kcal.
 */
export const checkProductCalories = async (calories: number): Promise<CalorieCheckResult> => {
  const res = await apiClient.get<CalorieCheckResult>(
    `/scoring/calorie-check/?calories=${calories}`,
  );
  return res.data;
};
