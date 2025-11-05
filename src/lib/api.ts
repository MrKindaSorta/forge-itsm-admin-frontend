import axios, { AxiosError } from 'axios';

// Get API base URL based on environment
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Production admin subdomain (admin.forge-itsm.com)
    if (hostname === 'admin.forge-itsm.com') {
      return `${window.location.protocol}//${hostname}`;
    }

    // Development or direct Pages access
    if (hostname === 'localhost' || hostname.includes('pages.dev')) {
      return 'https://itsm-backend.joshua-r-klimek.workers.dev';
    }
  }

  return 'https://itsm-backend.joshua-r-klimek.workers.dev';
}

// Create axios instance
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
