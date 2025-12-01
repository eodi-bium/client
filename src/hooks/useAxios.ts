import { useMemo, useEffect } from 'react';
import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { useAuth } from '../context/AuthContext';

export const useAxios = (): AxiosInstance => {
  const { accessToken } = useAuth();

  const instance = useMemo(() => {
    return axios.create({
      baseURL: import.meta.env.VITE_BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }, []);

  // 토큰 변경 시 헤더 업데이트
  useEffect(() => {
    if (accessToken) {
      instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete instance.defaults.headers.common['Authorization'];
    }
  }, [accessToken, instance]);

  useEffect(() => {
    const interceptor = instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError<{ message?: string }>) => {
        if (error.response) {
          const { message } = error.response.data;
          console.log(message);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      instance.interceptors.response.eject(interceptor);
    };
  }, [instance]);

  return instance;
};
