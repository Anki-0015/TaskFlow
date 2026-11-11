import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !error.config?.url?.endsWith('/auth/login')
    ) {
      window.dispatchEvent(new Event('taskflow:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
