import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { parseJwt } from '../util/auth';

interface AuthContextType {
  accessToken: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback((token: string) => {
    setAccessToken(token);

    // axios 기본 헤더 설정
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const payload = parseJwt(token);
    if (payload) {
      setIsLoggedIn(true);
      // role이 'admin'이거나 'ROLE_ADMIN'인 경우 관리자로 처리
      setIsAdmin(payload.role === 'admin' || payload.role === 'ROLE_ADMIN');
    } else {
      // 토큰 파싱 실패 시 처리
      setIsLoggedIn(false);
      setIsAdmin(false);
    }
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setIsLoggedIn(false);
    setIsAdmin(false);

    // axios 헤더 초기화
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  useEffect(() => {
    const silentRefresh = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await axios.post(`${apiUrl}/member/refresh`, null, {
          withCredentials: true,
        });

        const authHeader = response.headers['authorization'];
        if (authHeader) {
          const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
          login(token);
        }
      } catch (error) {
        // Refresh token이 없거나 만료된 경우 - 로그아웃 상태 유지
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    silentRefresh();
  }, [login, logout]);

  return (
    <AuthContext.Provider value={{ accessToken, isLoggedIn, isAdmin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
