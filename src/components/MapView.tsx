import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadTmapScript } from '../util/loadTmapScript';
import { MARKER_IMAGES } from '../constants/mapAssets';
import { getDistanceFromLatLonInMeters, getRecyclingType } from '../util/mapHelpers';
import { MapPopup } from './MapPopup';
import { NavigationOverlay } from './NavigationOverlay';

import type {
  Place,
  ApiResponse,
  SelectedPlaceInfo,
  RouteInfo,
  TmapMapInstance,
  TmapMarkerInstance,
  TmapPolylineInstance,
  RouteFeature,
} from '../types/tmap';

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

  // [변경 1] 마커 관리를 위한 Map 사용 (Key: 장소식별자, Value: 마커인스턴스)
  // 기존 배열 대신 Map을 사용하여 특정 마커의 존재 여부를 빠르게 파악합니다.
  const markersMapRef = useRef<Map<string, TmapMarkerInstance>>(new Map());

  const myLocationMarkerRef = useRef<TmapMarkerInstance | null>(null);
  const activeMarkerIdRef = useRef<string | null>(null); // Index 대신 ID(Key)로 관리

  const resultRoutePolylineRef = useRef<TmapPolylineInstance | null>(null);
  const routePointsRef = useRef<RouteFeature[]>([]);
  const lastSpokenTextRef = useRef<string>('');
  const isArrivalProcessRef = useRef(false);

  const [places, setPlaces] = useState<Place[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlaceInfo | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const [isTracking, setIsTracking] = useState(true);
  const [isCompassMode, setIsCompassMode] = useState(false);
  const [tbtInstruction, setTbtInstruction] = useState<string | null>(null);
  const [tbtDistance, setTbtDistance] = useState<string>('');

  const activeCategoryRef = useRef(activeCategory);
  const selectedPlaceRef = useRef<SelectedPlaceInfo | null>(null);
  const myLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);

  // [변경 2] 카테고리가 바뀌면 기존 마커들은 의미가 없으므로 싹 지워야 합니다.
  useEffect(() => {
    activeCategoryRef.current = activeCategory;
    // 카테고리 변경 시 맵 초기화 (기존 마커들 제거)
    if (markersMapRef.current.size > 0) {
      markersMapRef.current.forEach((marker) => marker.setMap(null));
      markersMapRef.current.clear();
    }
    // API 재호출을 유도하기 위해 places 비우기 (선택사항)
    setPlaces([]);
  }, [activeCategory]);

  useEffect(() => {
    myLocationRef.current = myLocation;
  }, [myLocation]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    if (lastSpokenTextRef.current === text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
    lastSpokenTextRef.current = text;
  };

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
        // [중요] 여기서 setPlaces를 호출하면 아래 useEffect가 실행되어 Diffing 로직이 돕니다.
        setPlaces(data.singlePlaceResponses);
      } else {
        setPlaces([]);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  }, []);

  const resetNavigation = () => {
    if (activeMarkerIdRef.current) {
      const activeKey = activeMarkerIdRef.current;
      const marker = markersMapRef.current.get(activeKey);
      if (marker) {
        marker.setMap(null); // 지도 화면에서 제거
        markersMapRef.current.delete(activeKey); // 메모리(Map)에서 제거
      }
      activeMarkerIdRef.current = null; // 활성 ID 초기화
    }
    setSelectedPlace(null);
    setRouteInfo(null);
    setTbtInstruction(null);
    routePointsRef.current = [];
    setIsCompassMode(false);
    isArrivalProcessRef.current = false;

    if (resultRoutePolylineRef.current) {
      resultRoutePolylineRef.current.setMap(null);
      resultRoutePolylineRef.current = null;
    }

    if (mapInstanceRef.current && myLocationRef.current) {
      if (typeof mapInstanceRef.current.setRotate === 'function') {
        mapInstanceRef.current.setRotate(0);
      }
      fetchPlaces(mapInstanceRef.current);
    }
  };

  const findPath = async () => {
    if (!myLocation || !selectedPlace || !mapInstanceRef.current) {
      alert('위치 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      if (resultRoutePolylineRef.current) {
        resultRoutePolylineRef.current.setMap(null);
      }
      isArrivalProcessRef.current = false;

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
          headers: {
            appKey: import.meta.env.VITE_TMAP_APP_KEY,
            'Content-Type': 'application/json',
          },
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
        const points: RouteFeature[] = [];

        data.features.forEach((feature: RouteFeature) => {
          if (feature.geometry.type === 'LineString') {
            feature.geometry.coordinates.forEach((coord: any) => {
              linePath.push(new window.Tmapv2.LatLng(coord[1], coord[0]));
            });
          } else if (feature.geometry.type === 'Point') {
            if (feature.properties.description) {
              points.push(feature);
            }
          }
        });

        routePointsRef.current = points;

        const polyline = new window.Tmapv2.Polyline({
          path: linePath,
          strokeColor: '#FF0000',
          strokeWeight: 6,
          map: mapInstanceRef.current,
        });
        resultRoutePolylineRef.current = polyline;

        setIsTracking(true);
        setIsCompassMode(true);

        const startMsg = `안내를 시작합니다. 약 ${Math.ceil(properties.totalTime / 60)}분 소요됩니다.`;
        setTbtInstruction(startMsg);
        speak(startMsg);
      }
    } catch (error) {
      console.error('경로 탐색 실패:', error);
      alert('경로를 찾을 수 없습니다.');
    }
  };

  // Map 초기화 (최초 1회)
  useEffect(() => {
    const mapElement = mapContainerRef.current;
    if (!mapElement) return;

    const initializeMap = () => {
      if (!window.Tmapv2) return;
      if (!mapInstanceRef.current) {
        const map = new window.Tmapv2.Map(mapElement, {
          center: new window.Tmapv2.LatLng(37.45, 126.6535),
          width: '100%',
          height: '100%',
          zoom: 17,
        });
        mapInstanceRef.current = map;

        const updateMapData = () => {
          if (selectedPlaceRef.current) return;
          if (mapInstanceRef.current) fetchPlaces(mapInstanceRef.current);
        };

        map.addListener('dragstart', () => setIsTracking(false));
        map.addListener('dragend', updateMapData);
        map.addListener('zoom_changed', updateMapData);
        map.addListener('click', () => {});
      }
    };
    loadTmapScript().then(initializeMap);

    return () => {
      if (mapInstanceRef.current?.destroy) mapInstanceRef.current.destroy();
    };
  }, []);

  // 리사이즈 핸들러
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

  // 나침반 모드 핸들러
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!isCompassMode || !mapInstanceRef.current) return;
      const heading = event.alpha;

      if (heading !== null && typeof mapInstanceRef.current.setRotate === 'function') {
        mapInstanceRef.current.setRotate(360 - heading);
      }
    };

    if (isCompassMode) {
      window.addEventListener('deviceorientation', handleOrientation);
    } else {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (mapInstanceRef.current && typeof mapInstanceRef.current.setRotate === 'function') {
        mapInstanceRef.current.setRotate(0);
      }
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isCompassMode]);

  // 위치 추적 핸들러
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMyLocation({ lat, lng });

        if (mapInstanceRef.current && window.Tmapv2) {
          const myLatLng = new window.Tmapv2.LatLng(lat, lng);
          const myIcon = routeInfo ? MARKER_IMAGES.START : MARKER_IMAGES.MY_LOCATION;

          if (myLocationMarkerRef.current) {
            myLocationMarkerRef.current.setPosition(myLatLng);
          } else {
            myLocationMarkerRef.current = new window.Tmapv2.Marker({
              position: myLatLng,
              map: mapInstanceRef.current,
              title: '내 위치',
              icon: myIcon,
              iconSize: new window.Tmapv2.Size(35, 35),
            });
            mapInstanceRef.current.setCenter(myLatLng);
            fetchPlaces(mapInstanceRef.current);
          }

          if (isTracking) {
            mapInstanceRef.current.setCenter(myLatLng);
          }

          // 경로 안내 로직
          if (routeInfo && selectedPlace && !isArrivalProcessRef.current) {
            const distToDest = getDistanceFromLatLonInMeters(
              lat,
              lng,
              selectedPlace.latitude,
              selectedPlace.longitude
            );

            if (distToDest < 20) {
              isArrivalProcessRef.current = true;
              speak('목적지에 도착했습니다.');
              setTimeout(() => {
                const confirmed = window.confirm('목적지에 도착했습니다! 안내를 종료합니다.');
                if (confirmed || !confirmed) {
                  window.location.reload();
                }
              }, 500);
              return;
            }

            let nearestPoint: RouteFeature | null = null;
            let minDist = 100000;
            routePointsRef.current.forEach((point) => {
              const pCoord = point.geometry.coordinates as number[];
              const d = getDistanceFromLatLonInMeters(lat, lng, pCoord[1], pCoord[0]);
              if (d < 30 && d < minDist) {
                minDist = d;
                nearestPoint = point;
              }
            });

            if (nearestPoint) {
              const point = nearestPoint as RouteFeature;
              const desc = point.properties.description;
              if (tbtInstruction !== desc) {
                setTbtInstruction(desc);
                setTbtDistance('잠시 후');
                speak(desc);
              }
            }
          }
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [fetchPlaces, isTracking, routeInfo, selectedPlace, tbtInstruction]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      resetNavigation();
    }
  }, [activeCategory]);

  // 내 위치 마커 아이콘 업데이트
  useEffect(() => {
    if (myLocationMarkerRef.current && mapInstanceRef.current && window.Tmapv2) {
      const myIcon = routeInfo ? MARKER_IMAGES.START : MARKER_IMAGES.MY_LOCATION;
      myLocationMarkerRef.current.setIcon(myIcon);
    }
  }, [routeInfo]);

  // [핵심 변경 3] 마커 렌더링 최적화 로직 (Diffing Algorithm)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.Tmapv2) return;

    // 1. 현재 보여줘야 할 장소 목록 결정
    let placesToRender = places;
    if (routeInfo && selectedPlace) {
      placesToRender = [selectedPlace];
    }

    // 2. 장소 식별을 위한 키 생성 함수 (ID가 없으면 좌표로 대체)
    const getPlaceKey = (place: Place) =>
      place.id ? String(place.id) : `${place.latitude}-${place.longitude}`;

    // 3. 현재 렌더링해야 할 모든 장소의 키 집합 생성
    const newPlaceKeys = new Set(placesToRender.map(getPlaceKey));

    // 4. [제거 단계] 더 이상 유효하지 않은(새 목록에 없는) 마커 제거
    markersMapRef.current.forEach((marker, key) => {
      if (!newPlaceKeys.has(key)) {
        marker.setMap(null);
        markersMapRef.current.delete(key);
      }
    });

    // 5. [추가/유지 단계] 마커 생성 및 관리
    let defaultIcon = MARKER_IMAGES.DEFAULT;
    if (activeCategory === 'battery') defaultIcon = MARKER_IMAGES.BATTERY;
    else if (activeCategory === 'light') defaultIcon = MARKER_IMAGES.LIGHT;
    else if (activeCategory === 'clothes') defaultIcon = MARKER_IMAGES.CLOTHES;

    let iconUrl = defaultIcon;
    if (routeInfo) {
      iconUrl = MARKER_IMAGES.END;
    }

    // 마커 생성 함수
    const createMarker = (place: Place, key: string, isBouncing: boolean) => {
      let aniType = routeInfo ? null : window.Tmapv2.MarkerOptions.ANIMATE_BALLOON;
      if (isBouncing) aniType = window.Tmapv2.MarkerOptions.ANIMATE_BOUNCE;

      const marker = new window.Tmapv2.Marker({
        position: new window.Tmapv2.LatLng(place.latitude, place.longitude),
        map: mapInstanceRef.current!,
        title: place.name,
        icon: iconUrl,
        iconSize: new window.Tmapv2.Size(35, 35),
        animation: aniType,
        animationLength: 300,
      });

      const handleMarkerAction = () => {
        if (routeInfo) return;

        // 이전에 활성화된 마커 복구
        const prevKey = activeMarkerIdRef.current;
        if (prevKey && prevKey !== key) {
          const prevMarkerInstance = markersMapRef.current.get(prevKey);
          if (prevMarkerInstance) {
            const prevPlace = places.find((p) => getPlaceKey(p) === prevKey);
            if (prevPlace) {
              prevMarkerInstance.setMap(null);
              // 복구 시에는 다시 클릭 리스너를 달아줘야 하므로 재귀적 구조 주의
              // 여기서는 간단히 createMarker 호출 (무한루프 방지 위해 isBouncing=false)
              const restoredMarker = createMarker(prevPlace, prevKey, false);
              markersMapRef.current.set(prevKey, restoredMarker);
            }
          }
        }

        // 현재 마커 바운싱 처리
        marker.setMap(null);
        const bouncingMarker = createMarker(place, key, true);
        markersMapRef.current.set(key, bouncingMarker);
        activeMarkerIdRef.current = key;

        let distText = '';
        if (myLocationRef.current) {
          const d = getDistanceFromLatLonInMeters(
            myLocationRef.current.lat,
            myLocationRef.current.lng,
            place.latitude,
            place.longitude
          );
          distText = `${(d / 1000).toFixed(2)}km`;
        }
        setSelectedPlace({ ...place, distanceText: distText });
        setIsTracking(false);
      };

      // [수정 3] 클릭과 터치 이벤트 모두 등록
      // 'click'은 PC 및 일반적인 모바일 터치
      marker.addListener('click', handleMarkerAction);

      // 'touchend'는 모바일에서 손을 뗐을 때 즉시 반응 (반응 속도 개선)
      // 주의: Tmap 버전에 따라 click과 중복 발생할 수 있으나,
      // 로직상 마커를 지우고(marker.setMap(null)) 새로 그리기 때문에 중복 실행되어도 큰 문제는 없음
      marker.addListener('touchend', handleMarkerAction);

      return marker;
    };

    // 6. 실제 순회하며 신규 마커 추가 (이미 있는 키는 건너뜀 = 최적화)
    placesToRender.forEach((place) => {
      const key = getPlaceKey(place);

      // [최적화 핵심] 이미 지도에 있는 마커라면 건드리지 않음
      if (!markersMapRef.current.has(key)) {
        // 단, 현재 선택된 마커(바운싱 중인)라면 바운싱 상태로 그려야 할 수도 있음 (리렌더링 시)
        // 하지만 여기 로직은 '새로 추가된 것'만 처리하므로 기본 상태로 그림
        const newMarker = createMarker(place, key, false);
        markersMapRef.current.set(key, newMarker);
      }
    });
  }, [places, activeCategory, routeInfo]);

  const handleCurrentLocationClick = () => {
    if (myLocation && mapInstanceRef.current) {
      const newCenter = new window.Tmapv2.LatLng(myLocation.lat, myLocation.lng);
      mapInstanceRef.current.setCenter(newCenter);
      setIsTracking(true);
      if (routeInfo) setIsCompassMode(true);
      fetchPlaces(mapInstanceRef.current);
    } else {
      alert('현재 위치를 확인 중입니다.');
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full bg-gray-200" />

      {routeInfo && tbtInstruction && (
        <NavigationOverlay instruction={tbtInstruction} distanceToNext={tbtDistance} />
      )}

      <button
        onClick={handleCurrentLocationClick}
        className={`absolute bottom-6 right-4 z-40 bg-white p-3 rounded-full shadow-lg border transition-colors ${
          isTracking ? 'text-blue-500 border-blue-500' : 'text-gray-600 border-gray-200'
        }`}
        style={{ bottom: selectedPlace ? '240px' : '80px' }}
      >
        <i
          className={`fas fa-crosshairs text-xl ${isCompassMode ? 'animate-pulse text-red-500' : ''}`}
        ></i>
      </button>

      {selectedPlace && (
        <MapPopup
          selectedPlace={selectedPlace}
          routeInfo={routeInfo}
          onClose={resetNavigation}
          onFindPath={findPath}
        />
      )}
    </div>
  );
};

export default MapView;
