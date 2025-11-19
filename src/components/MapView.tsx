import React, { useEffect, useRef } from 'react';
import { loadTmapScript } from '../util/loadTmapScript';

declare global {
  type TmapMapInstance = {
    destroy?: () => void;
  };

  type TmapNamespace = {
    Map: new (container: HTMLElement, options: Record<string, unknown>) => TmapMapInstance;
    Polyline: new (options: Record<string, unknown>) => unknown;
    LatLng: new (lat: number, lng: number) => unknown;
  };

  interface Window {
    Tmapv2: TmapNamespace;
  }
}

const MapView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<TmapMapInstance | null>(null);

  useEffect(() => {
    const mapElement = mapContainerRef.current;
    if (!mapElement) return;

    let isMounted = true;

    const initializeMap = () => {
      if (!isMounted || !mapElement || !window.Tmapv2 || !window.Tmapv2.Map) {
        return;
      }

      try {
        const map = new window.Tmapv2.Map(mapElement, {
          center: new window.Tmapv2.LatLng(37.450074, 126.653715),
          width: '100%',
          height: '100%',
          zoom: 15,
        });

        mapInstanceRef.current = map;
        mapInstanceRef.current = map;

        new window.Tmapv2.Polyline({
          path: [
            new window.Tmapv2.LatLng(37.451421, 126.655894),
            new window.Tmapv2.LatLng(37.451966, 126.656173),
            new window.Tmapv2.LatLng(37.45171, 126.657225),
            new window.Tmapv2.LatLng(37.452954, 126.657772),
            new window.Tmapv2.LatLng(37.453235, 126.659038),
          ],
          strokeColor: '#dd00dd',
          strokeWeight: 6,
          map: mapInstanceRef.current ?? undefined,
        });
      } catch (error) {
        console.error('Tmap 지도 또는 Polyline 생성 중 오류:', error);
      }
    };

    loadTmapScript()
      .then(() => {
        initializeMap();
      })
      .catch((error) => {
        console.error('Tmap 스크립트 로드 중 오류:', error);
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current && mapInstanceRef.current.destroy) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[400px] bg-gray-100 relative overflow-hidden"
    />
  );
};

export default MapView;
