/**
 * FoodLens Services — Axios API Client
 * Shared axios instance that auto-attaches the auth token to every request.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000/api' // USB: uses adb reverse tcp:8000 tcp:8000
  // Wi-Fi alternative: 'http://192.168.1.38:8000/api'  (phone+PC same Wi-Fi)
  : 'https://your-production-url.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — auto-attach auth token
apiClient.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor — handle 401 (token expired/invalid)
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Let the calling code handle errors — don't swallow them here
    return Promise.reject(error);
  },
);

export {API_BASE_URL};
export default apiClient;
