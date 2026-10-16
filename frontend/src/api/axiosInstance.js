import axios from 'axios';

// Create an Axios instance with default institutional backend base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds request timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor: Injects JWT Bearer Token from localStorage into every outgoing request
 */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vericred_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor: Catches 401 Unauthorized responses to clear expired sessions
 */
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login if token is invalid/expired
      localStorage.removeItem('vericred_token');
      localStorage.removeItem('vericred_user');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;