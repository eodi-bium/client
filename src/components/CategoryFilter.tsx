import React from 'react';
import type { Category } from '../types';

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
}) => {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-1">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer ${
            activeCategory === category.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300'
          }`}
        >
          <i className={`${category.icon} text-xs`}></i>
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;

