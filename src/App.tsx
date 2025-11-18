import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, AdminPage } from './components';
import { MapPage } from './pages/MapPage';
import type { NavItem } from './types';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 경로를 기반으로 activeNav 결정
  const getCurrentNav = () => {
    const path = location.pathname;
    if (path === '/') return 'map';
    if (path === '/list') return 'list';
    if (path === '/history') return 'history';
    if (path === '/admin') return 'admin';
    return 'map';
  };

  const [activeNav, setActiveNav] = useState(getCurrentNav());

  // 네비게이션 아이템
  const navItems: NavItem[] = [
    { id: 'map', label: '지도', icon: 'fas fa-map-marker-alt', active: activeNav === 'map' },
    { id: 'list', label: '목록', icon: 'fas fa-list', active: activeNav === 'list' },
    { id: 'history', label: '기록', icon: 'fas fa-history', active: activeNav === 'history' },
    { id: 'admin', label: '관리', icon: 'ri-admin-line', active: activeNav === 'admin' },
  ];

  const handleNavClick = (itemId: string) => {
    setActiveNav(itemId);

    // 라우팅
    switch (itemId) {
      case 'map':
        navigate('/');
        break;
      case 'list':
        navigate('/list');
        break;
      case 'history':
        navigate('/history');
        break;
      case 'admin':
        navigate('/admin');
        break;
    }
  };

  return (
    <div className="w-full h-screen bg-white relative overflow-hidden">
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/list" element={<div className="p-4">목록 페이지 (개발 예정)</div>} />
        <Route path="/history" element={<div className="p-4">기록 페이지 (개발 예정)</div>} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>

      {/* 하단 네비게이션 - admin 페이지에서는 숨기기 */}
      {location.pathname !== '/admin' && (
        <BottomNavigation items={navItems} onItemClick={handleNavClick} />
      )}
    </div>
  );
}

export default App;
