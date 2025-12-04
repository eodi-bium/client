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

  const markersMapRef = useRef<Map<string, TmapMarkerInstance>>(new Map());

  const myLocationMarkerRef = useRef<TmapMarkerInstance | null>(null);
  const activeMarkerIdRef = useRef<string | null>(null);

  // [추가] 이벤트 중복 실행 방지 (모바일 터치 + 클릭 동시 발생 차단)
  const lastActionTimeRef = useRef<number>(0);

  const resultRoutePolylineRef = useRef<TmapPolylineInstance | null>(null);
  const routePointsRef = useRef<RouteFeature[]>([]);
  const lastSpokenTextRef = useRef<string>('');
  const isArrivalProcessRef = useRef(false);

  // 드래그 상태 추적
  const isMapDraggingRef = useRef(false);

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

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
    if (markersMapRef.current.size > 0) {
      markersMapRef.current.forEach((marker) => marker.setMap(null));
      markersMapRef.current.clear();
    }
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
        marker.setMap(null);
        markersMapRef.current.delete(activeKey);
      }
      activeMarkerIdRef.current = null;
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

        map.addListener('dragstart', () => {
          isMapDraggingRef.current = true;
          setIsTracking(false);
        });

        map.addListener('dragend', () => {
          setTimeout(() => {
            isMapDraggingRef.current = false;
          }, 200);
          updateMapData();
        });

        map.addListener('zoom_changed', updateMapData);
        map.addListener('click', () => {});
      }
    };
    loadTmapScript().then(initializeMap);

    return () => {
      if (mapInstanceRef.current?.destroy) mapInstanceRef.current.destroy();
    };
  }, []);

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
              iconSize: new window.Tmapv2.Size(32, 32),
            });
            mapInstanceRef.current.setCenter(myLatLng);
            fetchPlaces(mapInstanceRef.current);
          }

          if (isTracking) {
            mapInstanceRef.current.setCenter(myLatLng);
          }

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
                speak('잠시 후' + desc);
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

  useEffect(() => {
    if (myLocationMarkerRef.current && mapInstanceRef.current && window.Tmapv2) {
      const myIcon = routeInfo ? MARKER_IMAGES.START : MARKER_IMAGES.MY_LOCATION;
      myLocationMarkerRef.current.setIcon(myIcon);
    }
  }, [routeInfo]);

  // [핵심 로직 개선]
  useEffect(() => {
    if (!mapInstanceRef.current || !window.Tmapv2) return;

    let placesToRender = places;
    if (routeInfo && selectedPlace) {
      placesToRender = [selectedPlace];
    }

    const getPlaceKey = (place: Place) =>
      place.id ? String(place.id) : `${place.latitude}-${place.longitude}`;

    // 1. 화면에서 사라져야 할 마커 제거
    const newPlaceKeys = new Set(placesToRender.map(getPlaceKey));
    markersMapRef.current.forEach((marker, key) => {
      if (!newPlaceKeys.has(key)) {
        marker.setMap(null);
        markersMapRef.current.delete(key);
      }
    });

    let defaultIcon = MARKER_IMAGES.DEFAULT;
    if (activeCategory === 'battery') defaultIcon = MARKER_IMAGES.BATTERY;
    else if (activeCategory === 'light') defaultIcon = MARKER_IMAGES.LIGHT;
    else if (activeCategory === 'clothes') defaultIcon = MARKER_IMAGES.CLOTHES;

    let iconUrl = defaultIcon;
    if (routeInfo) {
      iconUrl = MARKER_IMAGES.END;
    }

    // [중요] 마커 생성 및 등록 함수
    // 이 함수 안에서 "기존 마커 제거 -> 새 마커 생성"을 원자적으로 처리합니다.
    const createAndRegisterMarker = (place: Place, key: string, isBouncing: boolean) => {
      // [Safety] 해당 키의 마커가 이미 있다면 무조건 제거 (중복 방지)
      const existing = markersMapRef.current.get(key);
      if (existing) {
        existing.setMap(null);
      }

      let aniType = routeInfo ? null : window.Tmapv2.MarkerOptions.ANIMATE_BALLOON;
      if (isBouncing) aniType = window.Tmapv2.MarkerOptions.ANIMATE_BOUNCE;

      const marker = new window.Tmapv2.Marker({
        position: new window.Tmapv2.LatLng(place.latitude, place.longitude),
        map: mapInstanceRef.current!,
        title: place.name,
        icon: iconUrl,
        iconSize: new window.Tmapv2.Size(32, 32),
        animation: aniType,
        animationLength: 300,
      });

      // 맵(Ref)에 새 마커 등록
      markersMapRef.current.set(key, marker);

      // 핸들러 등록
      const handleAction = () => {
        // [Debounce] 0.3초 이내 중복 호출 방지 (모바일 터치+클릭)
        const now = Date.now();
        if (now - lastActionTimeRef.current < 300) return;
        lastActionTimeRef.current = now;

        if (isMapDraggingRef.current) return;
        if (routeInfo) return;

        const prevKey = activeMarkerIdRef.current;

        // 1. 이전 마커 복구 (Static으로 교체)
        // createAndRegisterMarker 함수가 "기존 바운싱 마커 제거"까지 알아서 수행함
        if (prevKey && prevKey !== key) {
          const prevPlace = places.find((p) => getPlaceKey(p) === prevKey);
          if (prevPlace) {
            createAndRegisterMarker(prevPlace, prevKey, false);
          }
        }

        // 2. 현재 마커 활성화 (Bouncing으로 교체)
        createAndRegisterMarker(place, key, true);

        activeMarkerIdRef.current = key;

        // 거리 계산 및 선택 상태 업데이트
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

      // click과 touchend 동시 등록 (Debounce로 제어)
      marker.addListener('click', handleAction);
      marker.addListener('touchend', handleAction);

      return marker;
    };

    // 초기 렌더링 루프
    placesToRender.forEach((place) => {
      const key = getPlaceKey(place);
      // 이미 맵에 존재하면 건드리지 않음 (효율성)
      if (!markersMapRef.current.has(key)) {
        createAndRegisterMarker(place, key, false);
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
      <div
        ref={mapContainerRef}
        className="w-full h-full bg-gray-200"
        style={{ touchAction: 'none' }}
      />

      {routeInfo && tbtInstruction && (
        <NavigationOverlay instruction={tbtInstruction} distanceToNext={tbtDistance} />
      )}

      <button
        onClick={handleCurrentLocationClick}
        className={`absolute bottom-6 right-4 z-40 bg-white p-3 rounded-full shadow-lg border transition-colors ${
          isTracking ? 'text-blue-500 border-blue-500' : 'text-gray-600 border-gray-200'
        }`}
        style={{ bottom: selectedPlace ? '280px' : '120px' }}
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
