import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants';

// Token storage keys
const ACCESS_TOKEN_KEY = 'hazardeye_access_token';
const REFRESH_TOKEN_KEY = 'hazardeye_refresh_token';

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// TOKEN MANAGEMENT
// ============================================

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// ============================================
// REQUEST INTERCEPTOR — attach auth token
// ============================================

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser/RN set the correct Content-Type (with boundary) for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR — handle 401 + token refresh
// ============================================

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, null, {
            params: { refresh_token: refreshToken },
          });

          const { access_token, refresh_token } = response.data;
          await setTokens(access_token, refresh_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        await clearTokens();
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================

export const authAPI = {
  register: (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    city?: string;
    role?: string;
    invite_code?: string;
  }) => api.post('/api/auth/register', data),

  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  getMe: () => api.get('/api/auth/me'),

  updatePushToken: (expo_push_token: string) =>
    api.put('/api/auth/push-token', { expo_push_token }),
};

// ============================================
// REPORTS API
// ============================================

export const reportsAPI = {
  create: (formData: FormData) =>
    api.post('/api/reports', formData, {
      timeout: 60000,
      // Do NOT set Content-Type manually — axios/browser will auto-set it
      // with the correct multipart boundary.
    }),

  list: (params: {
    status?: string;
    hazard_type?: string;
    severity_min?: number;
    severity_max?: number;
    min_lat?: number;
    min_lng?: number;
    max_lat?: number;
    max_lng?: number;
    constituency_id?: string;
    page?: number;
    page_size?: number;
  }) => api.get('/api/reports', { params }),

  get: (id: string) => api.get(`/api/reports/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch(`/api/reports/${id}/status`, { status }),

  verify: (id: string, type: string) =>
    api.post(`/api/reports/${id}/verify`, { type }),

  getVerifications: (id: string) =>
    api.get(`/api/reports/${id}/verifications`),
};

// ============================================
// HOTSPOTS API
// ============================================

export const hotspotsAPI = {
  get: (params: {
    city?: string;
    min_lat?: number;
    min_lng?: number;
    max_lat?: number;
    max_lng?: number;
    min_risk?: number;
  }) => api.get('/api/hotspots', { params }),
};

// ============================================
// CONSTITUENCIES API
// ============================================

export const constituenciesAPI = {
  list: (params?: { city?: string; sort_by?: string }) =>
    api.get('/api/constituencies', { params }),

  get: (id: string) => api.get(`/api/constituencies/${id}`),

  getStats: (id: string) => api.get(`/api/constituencies/${id}/stats`),
};

// ============================================
// LEADERBOARD API
// ============================================

export const leaderboardAPI = {
  get: (params?: { city?: string; period?: string; limit?: number }) =>
    api.get('/api/leaderboard', { params }),

  getMyStats: () => api.get('/api/leaderboard/me'),
};

// ============================================
// DASHBOARD API
// ============================================

export const dashboardAPI = {
  getStats: () => api.get('/api/dashboard/stats'),
};

// ============================================
// WEATHER API
// ============================================

export const weatherAPI = {
  getCurrent: (lat: number, lng: number) =>
    api.get('/api/weather/current', { params: { lat, lng } }),

  getOverlay: (minLat: number, minLng: number, maxLat: number, maxLng: number) =>
    api.get('/api/weather/overlay', {
      params: { min_lat: minLat, min_lng: minLng, max_lat: maxLat, max_lng: maxLng },
    }),

  getAlerts: (city: string) =>
    api.get('/api/weather/alerts', { params: { city } }),
};

export default api;
