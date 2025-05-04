import axios from 'axios';
import Cookies from 'js-cookie';
import mockApi from './mockApi';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      Cookies.remove('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// For development, use the mock API instead of real API calls
const isDevelopment = process.env.NODE_ENV === 'development';

// Export a proxy that will use either the real API or mock API
const apiProxy = new Proxy({} as typeof api, {
  get: (target, prop) => {
    if (isDevelopment) {
      // Use mock API in development
      return (mockApi as any)[prop] || api[prop as keyof typeof api];
    }
    // Use real API in production
    return api[prop as keyof typeof api];
  },
});

export default isDevelopment ? mockApi : api;