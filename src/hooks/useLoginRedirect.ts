import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export const useLoginRedirect = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const { login } = useAuth();

  useEffect(() => {
    const issueAccessToken = async () => {
      try {
        const apiUrl = import.meta.env.VITE_BASE_URL;
        // axios는 기본적으로 JSON 응답을 처리하며, 상태 코드가 2xx 범위를 벗어나면 에러를 던집니다.
        // 쿠키(리프레시 토큰 등)를 포함하기 위해 withCredentials: true 설정 추가
        const response = await axios.post(`${apiUrl}/member/refresh`, null, {
          withCredentials: true,
        });

        // 백엔드 변경 사항 반영: Access Token이 응답 바디(Body)에 포함됨
        const { accessToken } = response.data;

        if (accessToken) {
          // Context를 통해 메모리에 토큰 저장 및 로그인 처리
          login(accessToken);
          navigate('/', { replace: true });
        } else {
          console.error('AccessToken not found in response body');
          navigate('/');
        }
      } catch (error) {
        console.error('Error issuing access token:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    issueAccessToken();
  }, [navigate, login]);

  return { isLoading };
};
