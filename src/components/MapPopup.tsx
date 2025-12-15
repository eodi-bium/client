import React from 'react';
import type { SelectedPlaceInfo, RouteInfo } from '../types/tmap'; // 경로 수정 필요
import { formatTime, formatDistance } from '../util/mapHelpers';

interface MapPopupProps {
  selectedPlace: SelectedPlaceInfo;
  routeInfo: RouteInfo | null; // 경로 정보 (시간, 거리)
  onClose: () => void;
  onFindPath: () => void;
}

export const MapPopup: React.FC<MapPopupProps> = ({
  selectedPlace,
  routeInfo,
  onClose,
  onFindPath,
}) => {
  return (
    <div className="fixed bottom-5 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-xl shadow-2xl p-4 border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-2 z-10"
        >
          <i className="fas fa-times text-lg"></i>
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-1 pr-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-map-marker-alt text-green-600 text-lg lg:text-xl"></i>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-base lg:text-lg text-gray-800 break-keep leading-tight">
                  {selectedPlace.name || '수거함'}
                </h3>
                {selectedPlace.distanceText && !routeInfo && (
                  <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                    직선 {selectedPlace.distanceText}
                  </span>
                )}
              </div>
            </div>

            {routeInfo ? (
              <div className="my-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">예상 소요시간</span>
                  <span className="font-bold text-blue-600 text-lg">
                    {formatTime(routeInfo.totalTime)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-600 text-xs">이동 거리</span>
                  <span className="text-gray-800 text-sm">
                    {formatDistance(routeInfo.totalDistance)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-sm mb-2 flex items-center gap-2">
                <i className="fas fa-phone-alt text-gray-400 text-xs"></i>
                {selectedPlace.phone || '전화번호 없음'}
              </p>
            )}

            {/* 길찾기 버튼 */}
            {!routeInfo && (
              <button
                onClick={onFindPath}
                className="w-full mt-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                길찾기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
