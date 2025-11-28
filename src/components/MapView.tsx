import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadTmapScript } from '../util/loadTmapScript';

import myLocationIcon from '../assets/MY_POINT.png';
import batteryIcon from '../assets/BATTERY.png';
import lightIcon from '../assets/LIGHT.png';
import clothesIcon from '../assets/CLOTHES.png';

// ===================================================
// [1] 타입 및 헬퍼 함수 정의 (컴포넌트 외부로 이동)
// ===================================================

interface Place {
  name: string;
  latitude: number;
  longitude: number;
  phone: string;
}

interface ApiResponse {
  singlePlaceResponses: Place[];
}

interface SelectedPlaceInfo extends Place {
  distanceText: string;
}

// Tmap 관련 인터페이스 생략 (기존과 동일)
interface TmapLatLng {
  _lat: number;
  _lng: number;
  lat: () => number;
  lng: () => number;
}
interface TmapSize {
  _width: number;
  _height: number;
}
interface TmapBounds {
  getSouthWest: () => TmapLatLng;
  getNorthEast: () => TmapLatLng;
  toString: () => string;
}
interface TmapEvent {
  latLng: TmapLatLng;
  zoom?: number;
}
interface TmapMapInstance {
  setCenter: (latLng: TmapLatLng) => void;
  getBounds: () => TmapBounds;
  getCenter: () => TmapLatLng;
  getZoom: () => number;
  addListener: (eventType: string, callback: (e: TmapEvent) => void) => void;
  destroy: () => void;
  resize: (width?: string | number, height?: string | number) => void;
}
interface TmapMarkerInstance {
  setMap: (map: TmapMapInstance | null) => void;
  setPosition: (latLng: TmapLatLng) => void;
  addListener: (eventType: string, callback: (e: any) => void) => void;
}
interface TmapMapOptions {
  center: TmapLatLng;
  width: string;
  height: string;
  zoom: number;
}
interface TmapMarkerOptions {
  position: TmapLatLng;
  map: TmapMapInstance;
  title?: string;
  icon?: string;
  iconSize?: TmapSize;
  animation?: any;
  animationLength?: number;
}

declare global {
  interface Window {
    Tmapv2: {
      Map: new (element: HTMLElement, options: TmapMapOptions) => TmapMapInstance;
      LatLng: new (lat: number, lng: number) => TmapLatLng;
      Marker: new (options: TmapMarkerOptions) => TmapMarkerInstance;
      Size: new (width: number, height: number) => TmapSize;
      MarkerOptions: {
        ANIMATE_BALLOON: any;
        ANIMATE_DROP: any;
        ANIMATE_BOUNCE: any;
        ANIMATE_WIN: any;
      };
    };
  }
}

// ★ [수정] 헬퍼 함수들을 컴포넌트 밖으로 빼서 안정성 확보
const getDistanceFromLatLonInMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const getRecyclingType = (category: string) => {
  switch (category) {
    case 'battery':
      return 'BATTERY';
    case 'light':
      return 'LIGHT';
    case 'clothes':
      return 'CLOTHES';
    default:
      return 'BATTERY'; // 기본값 배터리
  }
};

const MARKER_IMAGES = {
  MY_LOCATION: myLocationIcon,
  BATTERY: batteryIcon,
  LIGHT: lightIcon,
  DEFAULT: batteryIcon,
  CLOTHES: clothesIcon,
};

interface MapViewProps {
  activeCategory?: string;
}

const MapView: React.FC<MapViewProps> = ({ activeCategory = 'battery' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<TmapMapInstance | null>(null);
  const markersRef = useRef<TmapMarkerInstance[]>([]);
  const myLocationMarkerRef = useRef<TmapMarkerInstance | null>(null);
  const activeMarkerIndexRef = useRef<number | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlaceInfo | null>(null);

  const activeCategoryRef = useRef(activeCategory);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  // ===================================================
  // [2] API 데이터 요청
  // ===================================================
  const fetchPlaces = useCallback(async (map: TmapMapInstance) => {
    try {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const ne = bounds.getNorthEast();

      const centerLat = center.lat();
      const centerLng = center.lng();

      const widthDist = getDistanceFromLatLonInMeters(centerLat, centerLng, centerLat, ne.lng());
      const heightDist = getDistanceFromLatLonInMeters(centerLat, centerLng, ne.lat(), centerLng);
      const minInfo = Math.min(widthDist, heightDist);
      const km = (minInfo / 1000).toFixed(2);

      const currentCategory = activeCategoryRef.current || 'battery';
      const typeToSend = getRecyclingType(currentCategory);

      const requestBody = {
        recyclingType: typeToSend,
        latitude: centerLat,
        longitude: centerLng,
        km: parseFloat(km),
      };

      const baseUrl = import.meta.env.VITE_BASE_URL;

      const response = await fetch(`${baseUrl}/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data && data.singlePlaceResponses) {
        setPlaces(data.singlePlaceResponses);
      } else {
        setPlaces([]);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  }, []); // 의존성 없음 (Ref 사용)

  // ===================================================
  // [3] 지도 초기화
  // ===================================================
  useEffect(() => {
    const mapElement = mapContainerRef.current;
    if (!mapElement) return;

    const initializeMap = () => {
      if (!window.Tmapv2) return;

      if (!mapInstanceRef.current) {
        const map = new window.Tmapv2.Map(mapElement, {
          center: new window.Tmapv2.LatLng(37.5665, 126.978),
          width: '100%',
          height: '100%',
          zoom: 15,
        });
        mapInstanceRef.current = map;

        // 드래그/줌 종료 이벤트 -> fetchPlaces 호출
        const updateMapData = () => {
          if (mapInstanceRef.current) fetchPlaces(mapInstanceRef.current);
        };

        map.addListener('dragend', updateMapData);
        map.addListener('zoom_changed', updateMapData);

        map.addListener('click', () => {
          setSelectedPlace(null);
          const prevIndex = activeMarkerIndexRef.current;
          if (prevIndex !== null) {
            activeMarkerIndexRef.current = null;
          }
        });
      }
    };

    loadTmapScript()
      .then(initializeMap)
      .catch((error) => console.error('Tmap 로드 실패:', error));

    return () => {
      if (mapInstanceRef.current && mapInstanceRef.current.destroy) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // ===================================================
  // [4] 화면 크기 변경 대응
  // ===================================================
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current && mapContainerRef.current) {
        const width = mapContainerRef.current.clientWidth;
        const height = mapContainerRef.current.clientHeight;
        mapInstanceRef.current.resize(width, height);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ===================================================
  // [5] 내 위치 실시간 추적
  // ===================================================
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMyLocation({ lat, lng });

        if (mapInstanceRef.current && window.Tmapv2) {
          const myLatLng = new window.Tmapv2.LatLng(lat, lng);

          if (myLocationMarkerRef.current) {
            myLocationMarkerRef.current.setPosition(myLatLng);
          } else {
            myLocationMarkerRef.current = new window.Tmapv2.Marker({
              position: myLatLng,
              map: mapInstanceRef.current,
              title: '내 위치',
              icon: MARKER_IMAGES.MY_LOCATION,
              iconSize: new window.Tmapv2.Size(24, 24),
            });
            mapInstanceRef.current.setCenter(myLatLng);
            fetchPlaces(mapInstanceRef.current);
          }
        }
      },
      (error) => console.error('위치 추적 실패:', error),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [fetchPlaces]);

  // ===================================================
  // [6] 카테고리 변경 시 즉시 데이터 요청
  // ===================================================
  useEffect(() => {
    if (mapInstanceRef.current) {
      setSelectedPlace(null);
      // 카테고리 변경 시에는 activeCategory가 이미 업데이트되었으므로 즉시 호출
      fetchPlaces(mapInstanceRef.current);
    }
  }, [activeCategory, fetchPlaces]);

  // ===================================================
  // [7] 마커 렌더링
  // ===================================================
  useEffect(() => {
    if (!mapInstanceRef.current || !window.Tmapv2) return;

    // 마커 초기화
    if (markersRef.current.length > 0) {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    }
    activeMarkerIndexRef.current = null;

    // 데이터가 있을 때 마커 생성
    if (places.length > 0) {
      let iconUrl = MARKER_IMAGES.DEFAULT;
      if (activeCategory === 'battery') iconUrl = MARKER_IMAGES.BATTERY;
      else if (activeCategory === 'light') iconUrl = MARKER_IMAGES.LIGHT;
      else if (activeCategory === 'clothes') iconUrl = MARKER_IMAGES.CLOTHES;

      let index = 0;
      let animationTimeoutId: NodeJS.Timeout;

      const createMarker = (i: number, isBouncing: boolean) => {
        const place = places[i];
        const lat = place.latitude;
        const lng = place.longitude;

        let distText = '';
        if (myLocation) {
          const dist = getDistanceFromLatLonInMeters(myLocation.lat, myLocation.lng, lat, lng);
          distText = `${dist}m`;
        }

        const aniType = isBouncing
          ? window.Tmapv2.MarkerOptions.ANIMATE_BOUNCE
          : window.Tmapv2.MarkerOptions.ANIMATE_BALLOON;

        const marker = new window.Tmapv2.Marker({
          position: new window.Tmapv2.LatLng(lat, lng),
          map: mapInstanceRef.current!,
          title: place.name,
          icon: iconUrl, // 결정된 아이콘 적용
          iconSize: new window.Tmapv2.Size(32, 32),
          animation: aniType,
          animationLength: 300,
        });

        marker.addListener('click', () => {
          const prevIndex = activeMarkerIndexRef.current;

          if (prevIndex !== null && prevIndex !== i && markersRef.current[prevIndex]) {
            const prevMarker = markersRef.current[prevIndex];
            prevMarker.setMap(null);
            markersRef.current[prevIndex] = createMarker(prevIndex, false);
          }

          marker.setMap(null);

          const bouncingMarker = new window.Tmapv2.Marker({
            position: new window.Tmapv2.LatLng(lat, lng),
            map: mapInstanceRef.current!,
            title: place.name,
            icon: iconUrl,
            iconSize: new window.Tmapv2.Size(32, 32),
            animation: window.Tmapv2.MarkerOptions.ANIMATE_BOUNCE,
          });

          bouncingMarker.addListener('click', () => {});

          markersRef.current[i] = bouncingMarker;
          activeMarkerIndexRef.current = i;
          setSelectedPlace({
            ...place,
            distanceText: distText,
          });
        });

        return marker;
      };

      const addMarkerWithDelay = () => {
        if (index >= places.length) return;
        const marker = createMarker(index, false);
        markersRef.current.push(marker);
        index++;
        animationTimeoutId = setTimeout(addMarkerWithDelay, 5);
      };

      addMarkerWithDelay();

      return () => {
        if (animationTimeoutId) clearTimeout(animationTimeoutId);
      };
    }
  }, [places, myLocation, activeCategory]); // activeCategory가 바뀌면 마커 다시 그리기

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full bg-gray-200" />

      {selectedPlace && (
        <div className="absolute bottom-6 left-4 right-4 z-50 animate-slide-up">
          <div className="bg-white rounded-xl shadow-2xl p-5 border border-gray-100 relative">
            <button
              onClick={() => setSelectedPlace(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
            >
              <i className="fas fa-times text-lg"></i>
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-map-marker-alt text-green-600 text-xl"></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-gray-800">
                    {selectedPlace.name ||
                      (activeCategory === 'clothes'
                        ? '의류 수거함'
                        : activeCategory === 'light'
                          ? '형광등 수거함'
                          : activeCategory === 'battery'
                            ? '배터리 수거함'
                            : '수거함')}
                  </h3>
                  {selectedPlace.distanceText && (
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      {selectedPlace.distanceText}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-2 flex items-center gap-2">
                  <i className="fas fa-phone-alt text-gray-400 text-xs"></i>
                  {selectedPlace.phone || '전화번호 없음'}
                </p>
                <button className="w-full mt-2 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                  길찾기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
