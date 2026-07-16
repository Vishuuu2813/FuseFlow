import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://fuseflow-production.up.railway.app/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://fuseflow-production.up.railway.app';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Crucial for refresh token cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { SOCKET_URL };
export default api;
