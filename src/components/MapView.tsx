import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadTmapScript } from '../util/loadTmapScript';
import { MARKER_IMAGES } from '../constants/mapAssets';
import { getDistanceFromLatLonInMeters, getRecyclingType } from '../util/mapHelpers';
import { MapPopup } from './MapPopup';
import type {
  Place,
  ApiResponse,
  SelectedPlaceInfo,
  RouteInfo,
  TmapLatLng,
  TmapMapInstance,
  TmapMarkerInstance,
  TmapPolylineInstance,
} from '../types/tmap';

// Window 전역 타입 (간소화)
declare global {
  interface Window {
    Tmapv2: any;
  }
}

interface MapViewProps {
  activeCategory?: string;
}

const MapView: React.FC<MapViewProps> = ({ activeCategory = 'battery' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<TmapMapInstance | null>(null);

  const markersRef = useRef<TmapMarkerInstance[]>([]);
  const myLocationMarkerRef = useRef<TmapMarkerInstance | null>(null);
  const activeMarkerIndexRef = useRef<number | null>(null);
  const resultRoutePolylineRef = useRef<TmapPolylineInstance | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlaceInfo | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  // ★ [추가] 트래킹 모드 상태 (true면 지도가 내 위치를 따라다님)
  const [isTracking, setIsTracking] = useState(true);

  const activeCategoryRef = useRef(activeCategory);
  const selectedPlaceRef = useRef<SelectedPlaceInfo | null>(null);
  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);
  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  // [API] 수거장 목록 가져오기
  const fetchPlaces = useCallback(async (map: TmapMapInstance) => {
    try {
      const center = map.getCenter();
      const ne = map.getBounds().getNorthEast();
      const centerLat = center.lat();
      const centerLng = center.lng();

      const widthDist = getDistanceFromLatLonInMeters(centerLat, centerLng, centerLat, ne.lng());
      const heightDist = getDistanceFromLatLonInMeters(centerLat, centerLng, ne.lat(), centerLng);
      const minInfo = Math.min(widthDist, heightDist);
      const km = (minInfo / 1000).toFixed(2);

      const currentCategory = activeCategoryRef.current || 'battery';
      const typeToSend = getRecyclingType(currentCategory);

      // console.log(`📡 데이터 요청: ${typeToSend}`);

      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recyclingType: typeToSend,
          latitude: centerLat,
          longitude: centerLng,
          km: parseFloat(km),
        }),
      });

      if (!response.ok) throw new Error('API Error');
      const data: ApiResponse = await response.json();

      if (data && data.singlePlaceResponses) {
        setPlaces(data.singlePlaceResponses);
      } else {
        setPlaces([]);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  }, []);

  // [API] 도보 경로 탐색
  const findPath = async () => {
    if (!myLocation || !selectedPlace || !mapInstanceRef.current) {
      alert('위치 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      if (resultRoutePolylineRef.current) {
        resultRoutePolylineRef.current.setMap(null);
      }

      const headers = {
        appKey: import.meta.env.VITE_TMAP_APP_KEY,
        'Content-Type': 'application/json',
      };

      const body = {
        startX: myLocation.lng,
        startY: myLocation.lat,
        endX: selectedPlace.longitude,
        endY: selectedPlace.latitude,
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        startName: '내위치',
        endName: selectedPlace.name || '목적지',
      };

      const response = await fetch(
        'https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json',
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (data.features) {
        const properties = data.features[0].properties;
        setRouteInfo({
          totalDistance: properties.totalDistance,
          totalTime: properties.totalTime,
        });

        const linePath: any[] = [];
        data.features.forEach((feature: any) => {
          if (feature.geometry.type === 'LineString') {
            feature.geometry.coordinates.forEach((coord: number[]) => {
              linePath.push(new window.Tmapv2.LatLng(coord[1], coord[0]));
            });
          }
        });

        const polyline = new window.Tmapv2.Polyline({
          path: linePath,
          strokeColor: '#FF0000',
          strokeWeight: 6,
          map: mapInstanceRef.current,
        });
        resultRoutePolylineRef.current = polyline;

        // ★ [추가] 경로 탐색 시작 시 내비게이션 모드 활성화 (선택 사항)
        setIsTracking(true);
      }
    } catch (error) {
      console.error('경로 탐색 실패:', error);
      alert('경로를 찾을 수 없습니다.');
    }
  };

  // [초기화] 지도 생성
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
          zoom: 17, // 내비게이션처럼 줌을 좀 더 당김
        });
        mapInstanceRef.current = map;

        const updateMapData = () => {
          if (selectedPlaceRef.current) {
            return;
          }
          if (mapInstanceRef.current) fetchPlaces(mapInstanceRef.current);
        };

        // ★ [중요] 드래그 시작 시 트래킹 모드 해제
        map.addListener('dragstart', () => {
          setIsTracking(false);
        });

        map.addListener('dragend', updateMapData);
        map.addListener('zoom_changed', updateMapData);

        map.addListener('click', () => {
          setSelectedPlace(null);
          setRouteInfo(null);
          if (activeMarkerIndexRef.current !== null) activeMarkerIndexRef.current = null;
          if (resultRoutePolylineRef.current) {
            resultRoutePolylineRef.current.setMap(null);
            resultRoutePolylineRef.current = null;
          }
        });
      }
    };
    loadTmapScript().then(initializeMap);

    return () => {
      if (mapInstanceRef.current?.destroy) mapInstanceRef.current.destroy();
    };
  }, []);
  useEffect(() => {
    // 팝업이 닫히면(null이 되면) 그 시점의 지도 중심으로 데이터 한 번 갱신해주는 게 좋음
    if (!selectedPlace && mapInstanceRef.current) {
      // console.log('🔓 팝업 닫힘 -> 데이터 갱신 재개');
      fetchPlaces(mapInstanceRef.current);
    }
  }, [selectedPlace, fetchPlaces]);
  // [Resize]
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current && mapContainerRef.current) {
        mapInstanceRef.current.resize(
          mapContainerRef.current.clientWidth,
          mapContainerRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // [Geolocation & Tracking]
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMyLocation({ lat, lng });

        if (mapInstanceRef.current && window.Tmapv2) {
          const myLatLng = new window.Tmapv2.LatLng(lat, lng);

          // 내 위치 마커 업데이트
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
            // 최초 로드 시 무조건 이동
            mapInstanceRef.current.setCenter(myLatLng);
            fetchPlaces(mapInstanceRef.current);
          }

          // ★ [핵심] 트래킹 모드일 때만 지도 중심을 내 위치로 이동
          if (isTracking) {
            mapInstanceRef.current.setCenter(myLatLng);
            // 내 위치 중심으로 데이터 갱신이 필요하다면 여기서 호출 (너무 잦은 호출 주의)
            // fetchPlaces(mapInstanceRef.current);
          }
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [fetchPlaces, isTracking]); // isTracking 의존성 추가

  // [Category Change]
  useEffect(() => {
    if (mapInstanceRef.current) {
      setSelectedPlace(null);
      setRouteInfo(null);
      if (resultRoutePolylineRef.current) {
        resultRoutePolylineRef.current.setMap(null);
        resultRoutePolylineRef.current = null;
      }
      fetchPlaces(mapInstanceRef.current);
    }
  }, [activeCategory, fetchPlaces]);

  // [Marker Rendering]
  useEffect(() => {
    if (!mapInstanceRef.current || !window.Tmapv2) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    activeMarkerIndexRef.current = null;

    if (places.length > 0) {
      let iconUrl = MARKER_IMAGES.DEFAULT;
      if (activeCategory === 'battery') iconUrl = MARKER_IMAGES.BATTERY;
      else if (activeCategory === 'light') iconUrl = MARKER_IMAGES.LIGHT;
      else if (activeCategory === 'clothes') iconUrl = MARKER_IMAGES.CLOTHES;

      let index = 0;
      let timeoutId: NodeJS.Timeout;

      const createMarker = (i: number, isBouncing: boolean) => {
        const place = places[i];
        const aniType = isBouncing
          ? window.Tmapv2.MarkerOptions.ANIMATE_BOUNCE
          : window.Tmapv2.MarkerOptions.ANIMATE_BALLOON;
        const marker = new window.Tmapv2.Marker({
          position: new window.Tmapv2.LatLng(place.latitude, place.longitude),
          map: mapInstanceRef.current!,
          title: place.name,
          icon: iconUrl,
          iconSize: new window.Tmapv2.Size(32, 32),
          animation: aniType,
          animationLength: 300,
        });

        marker.addListener('click', () => {
          const prevIndex = activeMarkerIndexRef.current;
          if (prevIndex !== null && prevIndex !== i && markersRef.current[prevIndex]) {
            markersRef.current[prevIndex].setMap(null);
            markersRef.current[prevIndex] = createMarker(prevIndex, false);
          }

          marker.setMap(null);
          const bouncingMarker = new window.Tmapv2.Marker({
            position: new window.Tmapv2.LatLng(place.latitude, place.longitude),
            map: mapInstanceRef.current!,
            title: place.name,
            icon: iconUrl,
            iconSize: new window.Tmapv2.Size(32, 32),
            animation: window.Tmapv2.MarkerOptions.ANIMATE_BOUNCE,
          });
          bouncingMarker.addListener('click', () => {});
          markersRef.current[i] = bouncingMarker;
          activeMarkerIndexRef.current = i;

          let distText = '';
          if (myLocation) {
            const d = getDistanceFromLatLonInMeters(
              myLocation.lat,
              myLocation.lng,
              place.latitude,
              place.longitude
            );
            distText = `${(d / 1000).toFixed(2)}km`;
          }

          setSelectedPlace({ ...place, distanceText: distText });
          setRouteInfo(null);
          if (resultRoutePolylineRef.current) {
            resultRoutePolylineRef.current.setMap(null);
            resultRoutePolylineRef.current = null;
          }

          // 마커 클릭 시 트래킹 잠시 중지 (사용자가 해당 장소를 보려고 하니까)
          setIsTracking(false);
        });
        return marker;
      };

      const addNextMarker = () => {
        if (index >= places.length) return;
        markersRef.current.push(createMarker(index, false));
        index++;
        timeoutId = setTimeout(addNextMarker, 1);
      };
      addNextMarker();

      return () => clearTimeout(timeoutId);
    }
  }, [places, myLocation, activeCategory]);

  // ★ [추가] 현 위치로 이동 버튼 핸들러
  const handleCurrentLocationClick = () => {
    if (myLocation && mapInstanceRef.current) {
      const newCenter = new window.Tmapv2.LatLng(myLocation.lat, myLocation.lng);
      mapInstanceRef.current.setCenter(newCenter);
      setIsTracking(true); // 트래킹 다시 켜기
      // 현 위치 기준 데이터 갱신
      fetchPlaces(mapInstanceRef.current);
    } else {
      alert('현재 위치를 확인 중입니다.');
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full bg-gray-200" />

      {/* ★ [추가] 현 위치(GPS) 버튼 (우측 하단) */}
      <button
        onClick={handleCurrentLocationClick}
        className={`absolute bottom-6 right-4 z-40 bg-white p-3 rounded-full shadow-lg border transition-colors ${
          isTracking ? 'text-blue-500 border-blue-500' : 'text-gray-600 border-gray-200'
        }`}
        style={{ bottom: selectedPlace ? '180px' : '24px' }} // 팝업이 뜨면 위로 이동
      >
        {/* FontAwesome GPS 아이콘 (없으면 텍스트나 다른 아이콘 사용) */}
        <i className="fas fa-crosshairs text-xl"></i>
      </button>

      {/* 팝업 UI */}
      {selectedPlace && (
        <MapPopup
          selectedPlace={selectedPlace}
          routeInfo={routeInfo}
          onClose={() => {
            setSelectedPlace(null);
            setRouteInfo(null);
            if (resultRoutePolylineRef.current) {
              resultRoutePolylineRef.current.setMap(null);
              resultRoutePolylineRef.current = null;
            }
          }}
          onFindPath={findPath}
        />
      )}
    </div>
  );
};

export default MapView;
