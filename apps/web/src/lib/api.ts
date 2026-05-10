import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Token storage - updated by AxiosInterceptor component
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (authToken && config.headers) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle common errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!error.response) {
      console.error("Network error:", error.message);
      return Promise.reject(new Error("Network error. Please check your connection."));
    }

    const status = error.response.status;

    if (status === 401) {
      console.warn("Unauthorized - redirecting to sign in");
      window.location.href = "/sign-in";
    } else if (status === 429) {
      console.warn("Rate limited. Please wait before retrying.");
    }

    return Promise.reject(error);
  }
);

export default api;