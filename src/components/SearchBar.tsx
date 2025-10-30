import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilterClick: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onFilterClick }) => {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="기기 이름으로 검색..."
        className="w-full h-10 pl-4 pr-12 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
        onClick={onFilterClick}
      >
        <i className="fas fa-filter text-gray-500 text-sm"></i>
      </button>
    </div>
  );
};

export default SearchBar;

