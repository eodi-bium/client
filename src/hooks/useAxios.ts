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

  // 에러 핸들링 인터셉터 설정
  useEffect(() => {
    const interceptor = instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError<{ message?: string }>) => {
        if (error.response) {
          const { status, data } = error.response;

          // 4xx, 5xx 에러인 경우
          if (status >= 400 && status < 600) {
            if (data?.message) {
              alert(data.message);
            }
          }
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
