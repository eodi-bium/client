// src/components/NavigationOverlay.tsx
import React from 'react';

interface NavigationOverlayProps {
  instruction: string; // 안내 멘트 (예: "100m 앞 우회전")
  distanceToNext: string; // 남은 거리 (예: "50m")
}

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({
  instruction,
  distanceToNext,
}) => {
  return (
    <div className="fixed top-5 left-4 right-4 z-50 animate-slide-down">
      <div className="bg-gray-900/90 backdrop-blur-sm text-white p-4 rounded-xl shadow-lg border-l-4 border-green-500">
        <div className="flex items-center gap-4">
          {/* 방향 아이콘 (단순화: 상황에 따라 이미지를 바꾸면 더 좋습니다) */}
          <div className="text-3xl">
            <i className="fas fa-arrow-circle-right text-green-400"></i>
          </div>

          <div className="flex-1">
            <div className="text-2xl font-bold text-white mb-1">{distanceToNext}</div>
            <div className="text-lg font-medium text-gray-200">{instruction}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
