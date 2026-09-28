/**
 * FoodLens Services — Auth API calls
 * Register and Login endpoints.
 */

import apiClient from './apiClient';

export interface AuthResponse {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
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

/**
 * Google Sign-In: send the Google ID token to the backend.
 * POST /api/auth/google/
 *
 * Backend verifies the token with Google and creates/returns user + auth token.
 */
export const googleLoginUser = async (
  idToken: string,
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>(
    '/auth/google/',
    {id_token: idToken},
  );
  return response.data;
};
