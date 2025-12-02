import React from 'react';

interface HeaderProps {
  onBackClick: () => void;
  onSettingsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBackClick, onSettingsClick }) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-between px-4 py-3 h-14">
        <button
          className="w-10 h-10 flex items-center justify-center cursor-pointer"
          onClick={onBackClick}
        >
          <i className="fas fa-arrow-left text-gray-800 text-lg"></i>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">어디 비움</h1>
        <button
          className="w-10 h-10 flex items-center justify-center cursor-pointer"
          onClick={onSettingsClick}
        >
          <i className="fas fa-cog text-gray-800 text-lg"></i>
        </button>
      </div>
    </div>
  );
};

export default Header;
