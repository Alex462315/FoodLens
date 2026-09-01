/**
 * FoodLens Services — Health Profile API calls
 * Full CRUD operations for health profiles.
 */

import apiClient from './apiClient';

export type SeverityLevel = 'mild' | 'moderate' | 'severe';

export interface ConditionItem {
  condition_name: string;
  severity: SeverityLevel;
}

export interface HealthProfile {
  id: number;
  profile_name: string;
  relation: string;
  age: number;
  gender: string;
  height_cm: number | null;
  weight_kg: number | null;
  conditions: ConditionItem[];
  allergies: string[];
  created_at: string;
  updated_at: string;
}

export interface HealthProfilePayload {
  profile_name: string;
  relation: string;
  age: number;
  gender: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  conditions?: ConditionItem[];
  allergies?: string[];
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: HealthProfile[];
}

/**
 * List all health profiles for the logged-in user.
 */
export const getHealthProfiles = async (): Promise<HealthProfile[]> => {
  const response = await apiClient.get<PaginatedResponse>('/health-profiles/');
  return response.data.results;
};

/**
 * Get a single health profile by ID.
 */
export const getHealthProfile = async (id: number): Promise<HealthProfile> => {
  const response = await apiClient.get<HealthProfile>(
    `/health-profiles/${id}/`,
  );
  return response.data;
};

/**
 * Create a new health profile.
 */
export const createHealthProfile = async (
  payload: HealthProfilePayload,
): Promise<HealthProfile> => {
  const response = await apiClient.post<HealthProfile>(
    '/health-profiles/',
    payload,
  );
  return response.data;
};

/**
 * Update a health profile (full update).
 */
export const updateHealthProfile = async (
  id: number,
  payload: HealthProfilePayload,
): Promise<HealthProfile> => {
  const response = await apiClient.put<HealthProfile>(
    `/health-profiles/${id}/`,
    payload,
  );
  return response.data;
};

/**
 * Delete a health profile.
 */
export const deleteHealthProfile = async (id: number): Promise<void> => {
  await apiClient.delete(`/health-profiles/${id}/`);
};
