import { useState } from 'react';
import { Header, CategoryFilter, MapView } from '../components';
import type { Category } from '../types';

export const MapPage = () => {
  const [activeCategory, setActiveCategory] = useState('battery');
  // 카테고리 데이터 (UI 표시용 정적 데이터이므로 유지)
  const categories: Category[] = [
    { id: 'battery', label: '배터리', icon: 'fas fa-battery-half', type: 'battery' },
    { id: 'light', label: '형광등', icon: 'fas fa-lightbulb', type: 'light' },
    { id: 'clothes', label: '의류', icon: 'fas fa-tshirt', type: 'clothes' },
  ];

  const handleBackClick = () => {
    console.log('뒤로가기 클릭');
  };

  const handleSettingsClick = () => {
    console.log('설정 클릭');
  };

  return (
    // ★ [수정] h-screen과 overflow-hidden을 주어 전체 화면 고정
    <div className="h-screen w-full bg-gray-50 overflow-hidden flex flex-col">
      {/* 헤더 */}
      <Header onBackClick={handleBackClick} onSettingsClick={handleSettingsClick} />

      {/* 검색 및 필터 영역 (Fixed 대신 그냥 flow에 태우고 z-index만 관리해도 됩니다, 여기선 기존 구조 유지) */}
      <div className="fixed top-14 left-0 right-0 bg-gray-50 border-b border-gray-200 z-40">
        <div className="p-4 space-y-3">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>
      </div>

      {/* 지도 영역 */}
      {/* ★ [수정] pt-32 (약 128px) 만큼 띄우고, MapView가 나머지를 채우도록 설정 */}
      <div className="w-full h-full pt-32 box-border">
        <MapView activeCategory={activeCategory} />
      </div>
    </div>
  );
};
