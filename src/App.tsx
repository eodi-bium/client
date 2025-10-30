import { useState } from 'react';
import { Header, SearchBar, CategoryFilter, MapView, BottomNavigation } from './components';
import type { Device, Category, NavItem } from './types';

function App() {
  const [searchValue, setSearchValue] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeNav, setActiveNav] = useState('map');

  // 카테고리 데이터
  const categories: Category[] = [
    { id: 'all', label: '전체', icon: 'fas fa-th-large', type: 'all' },
    { id: 'battery', label: '배터리', icon: 'fas fa-battery-half', type: 'battery' },
    { id: 'light', label: '형광등', icon: 'fas fa-lightbulb', type: 'light' },
    { id: 'phone', label: '스마트폰', icon: 'fas fa-mobile-alt', type: 'phone' },
  ];

  // 기기 데이터
  const devices: Device[] = [
    {
      id: '1',
      name: '배터리 1',
      type: 'battery',
      distance: 15,
      position: { lat: 1, lng: 2 },
    },
    {
      id: '2',
      name: '형광등 1',
      type: 'light',
      distance: 8,
      position: { lat: 1, lng: 2 },
    },
    {
      id: '3',
      name: '스마트폰 1',
      type: 'phone',
      distance: 23,
      position: { lat: 1, lng: 2 },
    },
    {
      id: '4',
      name: '형광등 2',
      type: 'light',
      distance: 12,
      position: { lat: 1, lng: 2 },
    },
    {
      id: '5',
      name: '배터리 2',
      type: 'battery',
      distance: 31,
      position: { lat: 1, lng: 2 },
    },
  ];

  // 네비게이션 아이템
  const navItems: NavItem[] = [
    { id: 'map', label: '지도', icon: 'fas fa-map-marker-alt', active: activeNav === 'map' },
    { id: 'list', label: '목록', icon: 'fas fa-list', active: activeNav === 'list' },
    { id: 'history', label: '기록', icon: 'fas fa-history', active: activeNav === 'history' },
    { id: 'profile', label: '내 정보', icon: 'fas fa-user', active: activeNav === 'profile' },
  ];

  // 필터링된 기기 목록
  const filteredDevices = devices.filter((device) => {
    const matchesCategory = activeCategory === 'all' || device.type === activeCategory;
    const matchesSearch = device.name.toLowerCase().includes(searchValue.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleBackClick = () => {
    console.log('뒤로가기 클릭');
  };

  const handleSettingsClick = () => {
    console.log('설정 클릭');
  };

  const handleFilterClick = () => {
    console.log('필터 클릭');
  };

  const handleDeviceClick = (device: Device) => {
    console.log('기기 클릭:', device);
  };

  const handleNavClick = (itemId: string) => {
    setActiveNav(itemId);
    console.log('네비게이션 클릭:', itemId);
  };

  return (
    <div className="w-full h-screen bg-white relative overflow-hidden">
      {/* 헤더 */}
      <Header onBackClick={handleBackClick} onSettingsClick={handleSettingsClick} />

      {/* 검색 및 필터 영역 */}
      <div className="fixed top-14 left-0 right-0 bg-gray-50 border-b border-gray-200 z-40">
        <div className="p-4 space-y-3">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            onFilterClick={handleFilterClick}
          />
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="pt-32 pb-20 h-full relative">
        <MapView devices={filteredDevices} onDeviceClick={handleDeviceClick} />
      </div>

      {/* 하단 네비게이션 */}
      <BottomNavigation items={navItems} onItemClick={handleNavClick} />
    </div>
  );
}

export default App;
