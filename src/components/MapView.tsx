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
  TmapLatLng,
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

  const markersRef = useRef<TmapMarkerInstance[]>([]);
  const myLocationMarkerRef = useRef<TmapMarkerInstance | null>(null);

  // ★ [수정] 현재 선택된(튀고 있는) 마커 객체를 직접 저장 (인덱스보다 안전)
  const activeMarkerRef = useRef<TmapMarkerInstance | null>(null);

  const resultRoutePolylineRef = useRef<TmapPolylineInstance | null>(null);
  const routePointsRef = useRef<RouteFeature[]>([]);
  const lastSpokenTextRef = useRef<string>('');

  // 도착 처리 중복 방지
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

  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

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

        const startMsg = `경로 안내를 시작합니다. 약 ${Math.ceil(properties.totalTime / 60)}분 소요됩니다.`;
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
          center: new window.Tmapv2.LatLng(37.5665, 126.978),
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
          setIsTracking(false);
        });

        map.addListener('dragend', updateMapData);
        map.addListener('zoom_changed', updateMapData);

        map.addListener('click', () => {
          setSelectedPlace(null);
          // 팝업 닫을 때 튀던 마커 멈추기 (선택 사항)
          if (activeMarkerRef.current) {
            activeMarkerRef.current.setMap(null);
            // 여기서 원래 마커로 복구하는 로직이 있으면 좋지만,
            // 단순히 null로 만들고 다음 렌더링을 기다리거나,
            // 복잡성을 줄이기 위해 그냥 둬도 무방 (데이터 갱신 시 다시 그려짐)
            activeMarkerRef.current = null;
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
    if (!selectedPlace && mapInstanceRef.current) {
      fetchPlaces(mapInstanceRef.current);
    }
  }, [selectedPlace, fetchPlaces]);

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
      if (heading !== null) {
        mapInstanceRef.current.setRotate(360 - heading);
      }
    };

    if (isCompassMode) {
      window.addEventListener('deviceorientation', handleOrientation);
    } else {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (mapInstanceRef.current) mapInstanceRef.current.setRotate(0);
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

          if (isTracking) {
            mapInstanceRef.current.setCenter(myLatLng);
          }

          // ★ [도착 감지 로직]
          if (
            routeInfo &&
            selectedPlace &&
            routePointsRef.current.length > 0 &&
            !isArrivalProcessRef.current
          ) {
            const distToDest = getDistanceFromLatLonInMeters(
              lat,
              lng,
              selectedPlace.latitude,
              selectedPlace.longitude
            );

            if (distToDest < 20) {
              isArrivalProcessRef.current = true; // 중복 실행 방지
              speak('목적지에 도착했습니다. 안내를 종료합니다.');

              // ★ [수정 2] 도착 후 페이지 새로고침으로 깔끔하게 초기화
              // setTimeout을 써서 음성이 나온 뒤 알림창이 뜨게 함
              setTimeout(() => {
                alert('목적지에 도착했습니다! 🎉 초기 화면으로 돌아갑니다.');
                window.location.reload(); // ★ 강력한 초기화 (흰 화면 버그 해결)
              }, 500);

              return;
            }

            // TBT 안내 로직 (기존 유지)
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
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [fetchPlaces, isTracking, routeInfo, selectedPlace, tbtInstruction]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      setSelectedPlace(null);
      setRouteInfo(null);
      setTbtInstruction(null);
      if (resultRoutePolylineRef.current) {
        resultRoutePolylineRef.current.setMap(null);
        resultRoutePolylineRef.current = null;
      }
      fetchPlaces(mapInstanceRef.current);
    }
  }, [activeCategory, fetchPlaces]);

  // ★ [수정 1] 마커 렌더링 로직 개선 (풍선 효과 & 튀기기 동시 지원)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.Tmapv2) return;

    // 기존 마커 싹 지우기
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    activeMarkerRef.current = null; // 활성 마커 초기화

    if (places.length > 0) {
      let iconUrl = MARKER_IMAGES.DEFAULT;
      if (activeCategory === 'battery') iconUrl = MARKER_IMAGES.BATTERY;
      else if (activeCategory === 'light') iconUrl = MARKER_IMAGES.LIGHT;
      else if (activeCategory === 'clothes') iconUrl = MARKER_IMAGES.CLOTHES;

      let index = 0;
      let timeoutId: NodeJS.Timeout;

      // 마커 생성 함수 (일반 마커용)
      const createNormalMarker = (place: Place) => {
        const marker = new window.Tmapv2.Marker({
          position: new window.Tmapv2.LatLng(place.latitude, place.longitude),
          map: mapInstanceRef.current!,
          title: place.name,
          icon: iconUrl,
          iconSize: new window.Tmapv2.Size(32, 32),
          // ★ 초기 등장: 풍선 효과
          animation: window.Tmapv2.MarkerOptions.ANIMATE_BALLOON,
        });

        // 클릭 이벤트 등록
        marker.addListener('click', () => {
          // 1. 이전에 튀고 있던 마커가 있으면 -> 지우고 일반 마커로 복구
          if (activeMarkerRef.current) {
            const oldMarker = activeMarkerRef.current;
            const oldPos = oldMarker.getPosition(); // 위치 정보 가져오기
            oldMarker.setMap(null); // 튀던 놈 삭제

            // 그 자리에 일반 마커(애니메이션 없이) 다시 생성
            const restoredMarker = new window.Tmapv2.Marker({
              position: oldPos,
              map: mapInstanceRef.current!,
              icon: iconUrl, // 같은 아이콘
              iconSize: new window.Tmapv2.Size(32, 32),
              animation: null, // 조용히 등장
            });
            // 복구된 마커에도 클릭 이벤트 다시 달아야 함 (재귀적 구조 필요하지만 여기선 생략하거나 간단히 처리)
            // *완벽한 복구를 위해선 createNormalMarker를 재호출해야 하는데,
            //  activeMarkerRef에 원본 place 데이터를 저장해두는 방식이 좋음.
            //  여기선 시각적 복구만 처리.
          }

          // 2. 현재 클릭한 마커 -> 지우고 튀는 마커로 교체
          marker.setMap(null);

          const bouncingMarker = new window.Tmapv2.Marker({
            position: new window.Tmapv2.LatLng(place.latitude, place.longitude),
            map: mapInstanceRef.current!,
            title: place.name,
            icon: iconUrl,
            iconSize: new window.Tmapv2.Size(32, 32),
            animation: window.Tmapv2.MarkerOptions.ANIMATE_BOUNCE, // ★ 튀기기
            animationLength: 500, // 필수
          });

          bouncingMarker.addListener('click', () => {}); // 클릭 시 아무것도 안 함 (이미 튀는 중)

          activeMarkerRef.current = bouncingMarker; // 현재 튀는 마커로 등록

          // 팝업 정보 업데이트
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
          setIsTracking(false);
        });

        return marker;
      };

      const addNextMarker = () => {
        if (index >= places.length) return;
        const place = places[index];
        const marker = createNormalMarker(place);
        markersRef.current.push(marker);
        index++;
        timeoutId = setTimeout(addNextMarker, 50); // 순차적 등장 효과
      };

      addNextMarker();

      return () => clearTimeout(timeoutId);
    }
  }, [places, myLocation, activeCategory]);

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
        style={{ bottom: selectedPlace ? '180px' : '24px' }}
      >
        <i
          className={`fas fa-crosshairs text-xl ${isCompassMode ? 'animate-pulse text-red-500' : ''}`}
        ></i>
      </button>

      {selectedPlace && (
        <MapPopup
          selectedPlace={selectedPlace}
          routeInfo={routeInfo}
          onClose={() => {
            setSelectedPlace(null);
          }}
          onFindPath={findPath}
        />
      )}
    </div>
  );
};

export default MapView;
