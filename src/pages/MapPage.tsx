import { useState } from 'react';
import { Header, CategoryFilter, MapView } from '../components';
import { RECYCLING_CATEGORIES } from '../constants/categories';
import type { Category, DeviceType } from '../types';

export const MapPage = () => {
  const [activeCategory, setActiveCategory] = useState('battery');
  // 카테고리 데이터 (통합 상수에서 생성)
  const categories: Category[] = RECYCLING_CATEGORIES.map((item) => ({
    id: item.id,
    label: item.mapLabel,
    icon: item.icon,
    type: item.id as DeviceType,
  }));

  return (
    // ★ [수정] h-screen과 overflow-hidden을 주어 전체 화면 고정
    <div className="h-screen w-full bg-gray-50 overflow-hidden flex flex-col">
      <Header />

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
