import React from 'react';
import type { NavItem } from '../types';

interface BottomNavigationProps {
  items: NavItem[];
  onItemClick: (itemId: string) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ items, onItemClick }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="grid grid-cols-2 h-16 relative">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`flex flex-col items-center justify-center space-y-1 cursor-pointer ${
              index === 0 ? 'relative' : ''
            }`}
            onClick={() => onItemClick(item.id)}
          >
            {/* 첫 번째 아이템(지도)일 때만 오른쪽에 구분선 추가 */}
            {index === 0 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-[1px] bg-gray-200"></div>
            )}
            <i
              className={`${item.icon} text-lg ${item.active ? 'text-blue-600' : 'text-gray-400'}`}
            ></i>
            <span
              className={`text-xs ${item.active ? 'text-blue-600 font-medium' : 'text-gray-400'}`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;
