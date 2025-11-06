// src/lib/api.ts

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = refreshResponse.headers.authorization?.split(' ')[1];
        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // ✅ [핵심 수정] 갱신 실패 시, localStorage를 정리하고 커스텀 이벤트를 발생시킨다.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('username');
        delete api.defaults.headers.common['Authorization'];
        if (typeof window !== 'undefined') {
          // AuthProvider가 이 이벤트를 듣고 로그아웃 처리를 하도록 한다.
          window.dispatchEvent(new CustomEvent('sessionExpired'));
        }
        // 여기서 에러를 다시 던져서, 원래 요청을 했던 곳(catch 블록)으로 실패를 알린다.
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;