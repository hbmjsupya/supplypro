import axios, { AxiosError } from 'axios';
import { message } from 'antd';

const request = axios.create({
  baseURL: '/api', // Vite proxy will handle this
  timeout: 10000,
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Request interceptor
request.interceptors.request.use(
  (config) => {
    // Add token if exists (for future security implementation)
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
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
    // If response has 'code' field, treat it as wrapped response
    if (res && typeof res.code === 'number') {
        if (res.code !== 200) {
            message.error(res.message || 'Error');
            return Promise.reject(new Error(res.message || 'Error'));
        }
        return res.data;
    }
    
    // If no 'code' field, assume it's a direct response (e.g. DTO) and return it as is
    return res;
  },
  async (error: AxiosError) => {
    const config = error.config as any;

    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Handle 500 Internal Server Error with Retry Logic
    if (error.response && error.response.status === 500) {
        // Only retry for GET requests or idempotent operations if needed
        // For now, we apply conservative retry
        if (config && config.method === 'get') {
             config.__retryCount = config.__retryCount || 0;
             if (config.__retryCount < MAX_RETRIES) {
                 config.__retryCount += 1;
                 await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                 return request(config);
             }
        }
        const data = error.response.data as any;
        const serverMsg = data?.message || '系统内部错误，请联系管理员';
        console.error('Backend 500 Error:', data);
        message.error(serverMsg);
        return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response && error.response.status === 403) {
        message.error('您没有权限执行此操作');
        return Promise.reject(error);
    }
    
    // Handle 400 Bad Request
    if (error.response && error.response.status === 400) {
        const data = error.response.data as any;
        const serverMsg = data?.message || '请求参数错误';
        message.error(serverMsg);
        return Promise.reject(error);
    }

    const data = error.response?.data as any;
    const netMsg = data?.message || error.message || 'Network Error';
    message.error(netMsg);
    return Promise.reject(error);
  }
);

export default request;
