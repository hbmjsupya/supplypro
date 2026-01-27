import axios from 'axios';
import { message } from 'antd';

const request = axios.create({
  baseURL: '/api', // Vite proxy will handle this
  timeout: 10000,
});

// Request interceptor
request.interceptors.request.use(
  (config) => {
    // Add token if exists (for future security implementation)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
request.interceptors.response.use(
  (response) => {
    const res = response.data;
    // Match the ApiResponse structure from backend
    if (res.code !== 200) {
      message.error(res.message || 'Error');
      return Promise.reject(new Error(res.message || 'Error'));
    }
    return res.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    message.error(error.message || 'Network Error');
    return Promise.reject(error);
  }
);

export default request;
