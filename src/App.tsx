import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation } from './components';
import { MapPage } from './pages/MapPage';
import { AdminPage } from './pages/AdminPage';
import { EventInfoPage } from './pages/EventInfoPage';
import { MyPage } from './pages/MyPage';
import { LoginRedirectPage } from './pages/LoginRedirectPage';
import type { NavItem } from './types';
import { useAuth } from './context/AuthContext';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();

  // 현재 경로를 기반으로 activeNav 결정
  const getCurrentNav = useCallback(() => {
    const path = location.pathname;
    if (path === '/') return 'map';
    if (path === '/admin') return 'admin';
    if (path === '/my') return 'my';
    return 'map';
  }, [location.pathname]);

  const [activeNav, setActiveNav] = useState(getCurrentNav());

  // URL 변경 시 네비게이션 상태 동기화
  useEffect(() => {
    setActiveNav(getCurrentNav());
  }, [getCurrentNav]);

  // 인증 상태에 따른 네비게이션 아이템 결정
  const getAuthNavItem = (): NavItem => {
    if (!isLoggedIn) {
      return {
        id: 'login',
        label: '로그인',
        icon: 'ri-login-box-line',
        active: activeNav === 'login',
      };
    }
    if (isAdmin) {
      return { id: 'admin', label: '관리', icon: 'ri-admin-line', active: activeNav === 'admin' };
    }
    return { id: 'my', label: '마이페이지', icon: 'fas fa-user', active: activeNav === 'my' };
  };

  // 네비게이션 아이템
  const navItems: NavItem[] = [
    { id: 'map', label: '지도', icon: 'fas fa-map-marker-alt', active: activeNav === 'map' },
    getAuthNavItem(),
  ];

  const handleNavClick = (itemId: string) => {
    if (itemId === 'login') {
      const apiUrl = import.meta.env.VITE_BASE_URL;
      window.location.href = `${apiUrl}/oauth2/authorization/kakao`;
      return;
    }

    setActiveNav(itemId);

    // 라우팅
    switch (itemId) {
      case 'map':
        navigate('/');
        break;
      case 'admin':
        navigate('/admin');
        break;
      case 'my':
        navigate('/my');
        break;
    }
  };

  if (isLoading) {
    return <div className="w-full min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-white relative overflow-x-hidden overflow-y-auto">
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/event-info" element={<EventInfoPage />} />
        <Route path="/redirect/login" element={<LoginRedirectPage />} />
      </Routes>

      <BottomNavigation items={navItems} onItemClick={handleNavClick} />
    </div>
  );
}

export default App;
