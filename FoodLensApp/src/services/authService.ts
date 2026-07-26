/**
 * FoodLens Services — Auth API calls
 * Register and Login endpoints.
 */

import apiClient from './apiClient';

export interface AuthResponse {
  id: number;
  username: string;
  email: string;
  token: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  password2: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

/**
 * Register a new user.
 * POST /api/auth/register/
 */
export const registerUser = async (
  payload: RegisterPayload,
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>(
    '/auth/register/',
    payload,
  );
  return response.data;
};

/**
 * Login an existing user.
 * POST /api/auth/login/
 */
export const loginUser = async (
  payload: LoginPayload,
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>(
    '/auth/login/',
    payload,
  );
  return response.data;
};
