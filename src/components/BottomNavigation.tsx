import React from 'react';
import type { NavItem } from '../types';

interface BottomNavigationProps {
  items: NavItem[];
  onItemClick: (itemId: string) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ items, onItemClick }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="grid grid-cols-4 h-16">
        {items.map((item) => (
          <button
            key={item.id}
            className="flex flex-col items-center justify-center space-y-1 cursor-pointer"
            onClick={() => onItemClick(item.id)}
          >
            <i className={`${item.icon} text-lg ${item.active ? 'text-blue-600' : 'text-gray-400'}`}></i>
            <span className={`text-xs ${item.active ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;

