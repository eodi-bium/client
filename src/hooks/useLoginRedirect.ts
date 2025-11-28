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
        const apiUrl = import.meta.env.VITE_API_URL;
        // axios는 기본적으로 JSON 응답을 처리하며, 상태 코드가 2xx 범위를 벗어나면 에러를 던집니다.
        // 쿠키(리프레시 토큰 등)를 포함하기 위해 withCredentials: true 설정 추가
        const response = await axios.post(`${apiUrl}/member/refresh`, null, {
          withCredentials: true,
        });

        // 헤더 이름은 소문자로 접근하는 것이 안전합니다.
        const authHeader = response.headers['Authorization'];

        if (authHeader) {
          const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

          // Context를 통해 메모리에 토큰 저장 및 로그인 처리
          login(token);
          navigate('/', { replace: true });
        } else {
          console.error('Authorization header not found');
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
