import React, { useEffect, useRef } from 'react';
import type { Device } from '../types';

// Tmapv2 타입 선언
declare global {
  interface Window {
    Tmapv2: any;
  }
}

interface MapViewProps {
  devices: Device[];
  onDeviceClick: (device: Device) => void;
}

const MapView: React.FC<MapViewProps> = ({ devices, onDeviceClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    const mapElement = mapContainerRef.current;
    if (!mapElement) return;

    if (window.Tmapv2 && window.Tmapv2.Map) {
      try {
        const map = new window.Tmapv2.Map(mapElement, {
          center: new window.Tmapv2.LatLng(37.450074, 126.653715),
          width: '100%',
          height: '100%',
          zoom: 15,
        });

        mapInstanceRef.current = map;

        const polyline = new window.Tmapv2.Polyline({
          path: [
            new window.Tmapv2.LatLng(37.451421, 126.655894),
            new window.Tmapv2.LatLng(37.451966, 126.656173),
            new window.Tmapv2.LatLng(37.45171, 126.657225),
            new window.Tmapv2.LatLng(37.452954, 126.657772),
            new window.Tmapv2.LatLng(37.453235, 126.659038),
          ],
          strokeColor: '#dd00dd',
          strokeWeight: 6,
          map: map,
        });
      } catch (e) {
        console.error('Tmap 지도 또는 Polyline 생성 중 오류:', e);
      }
    } else {
      console.error('Tmapv2 라이브러리를 찾을 수 없습니다. index.html을 확인하세요.');
    }

    return () => {
      if (mapInstanceRef.current && mapInstanceRef.current.destroy) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []); // 마운트 시 1회만 실행

  return (
    <div ref={mapContainerRef} className="w-full h-full bg-gray-100 relative overflow-hidden" />
  );
};

export default MapView;
