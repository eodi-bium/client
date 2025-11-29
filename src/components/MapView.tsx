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

  const activeMarkerIndexRef = useRef<number | null>(null);

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
  useEffect(() => {
    activeCategoryRef.current = activeCategory;
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
    setSelectedPlace(null);
    setRouteInfo(null);
    setTbtInstruction(null);
    routePointsRef.current = [];
    setIsCompassMode(false);
    isArrivalProcessRef.current = false;
    activeMarkerIndexRef.current = null;

    if (resultRoutePolylineRef.current) {
      resultRoutePolylineRef.current.setMap(null);
      resultRoutePolylineRef.current = null;
    }

    if (mapInstanceRef.current && myLocationRef.current) {
      if (typeof mapInstanceRef.current.setRotate === 'function') {
        mapInstanceRef.current.setRotate(0);
      }

      mapInstanceRef.current.setCenter(
        new window.Tmapv2.LatLng(myLocationRef.current.lat, myLocationRef.current.lng)
      );
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

        map.addListener('dragstart', () => setIsTracking(false));
        map.addListener('dragend', updateMapData);
        map.addListener('zoom_changed', updateMapData);
        map.addListener('click', () => {
          // 지도 클릭 시
        });
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

  // [Geolocation & Tracking & TBT]
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMyLocation({ lat, lng });

        if (mapInstanceRef.current && window.Tmapv2) {
          const myLatLng = new window.Tmapv2.LatLng(lat, lng);

          // ★ [수정] 내 위치 마커 업데이트 (길찾기 중이면 START 아이콘)
          // routeInfo가 있으면 START 아이콘, 없으면 MY_LOCATION 아이콘
          const myIcon = routeInfo ? MARKER_IMAGES.START : MARKER_IMAGES.MY_LOCATION;

          if (myLocationMarkerRef.current) {
            myLocationMarkerRef.current.setPosition(myLatLng);
            // setIcon 메서드가 있다면 아이콘 변경 (Tmap API 확인 필요, 없으면 재생성)
            // 보통 setIcon이 지원되지 않을 수 있으므로, 상태가 바뀔 때 재생성하는 것이 안전
            // 하지만 여기서는 편의상 매번 재생성하지 않고 렌더링 사이클에 맡김
            // (아래 useEffect에서 routeInfo 변경 시 마커 전체를 다시 그림)
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

          // 도착 감지
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

            // TBT
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
      resetNavigation();
    }
  }, [activeCategory]);

  // ★ [핵심] 내 위치 마커 아이콘 변경 감지 (routeInfo 변경 시)
  useEffect(() => {
    if (myLocationMarkerRef.current && mapInstanceRef.current && window.Tmapv2) {
      const myIcon = routeInfo ? MARKER_IMAGES.START : MARKER_IMAGES.MY_LOCATION;
      // 기존 마커 지우고 새로 생성 (setIcon이 없을 경우 대비)
      myLocationMarkerRef.current.setMap(null);

      const pos = myLocationRef.current
        ? new window.Tmapv2.LatLng(myLocationRef.current.lat, myLocationRef.current.lng)
        : mapInstanceRef.current.getCenter();

      myLocationMarkerRef.current = new window.Tmapv2.Marker({
        position: pos,
        map: mapInstanceRef.current,
        title: '내 위치',
        icon: myIcon,
        iconSize: new window.Tmapv2.Size(32, 32),
      });
    }
  }, [routeInfo]); // 길찾기 시작/종료 시 실행

  // ===================================================
  // [Marker Rendering]
  // ===================================================
  useEffect(() => {
    if (!mapInstanceRef.current || !window.Tmapv2) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    activeMarkerIndexRef.current = null;

    // 렌더링 대상 결정
    let placesToRender = places;
    if (routeInfo && selectedPlace) {
      placesToRender = [selectedPlace];
    }

    if (placesToRender.length > 0) {
      // 기본 아이콘 결정
      let defaultIcon = MARKER_IMAGES.DEFAULT;
      if (activeCategory === 'battery') defaultIcon = MARKER_IMAGES.BATTERY;
      else if (activeCategory === 'light') defaultIcon = MARKER_IMAGES.LIGHT;
      else if (activeCategory === 'clothes') defaultIcon = MARKER_IMAGES.CLOTHES;

      // ★ [수정] 길찾기 중이면 목적지 아이콘(END) 사용
      let iconUrl = defaultIcon;
      if (routeInfo) {
        iconUrl = MARKER_IMAGES.END;
      }

      let index = 0;
      let timeoutId: NodeJS.Timeout;

      const createMarkerInstance = (index: number, place: Place, isBouncing: boolean) => {
        let aniType = routeInfo ? null : window.Tmapv2.MarkerOptions.ANIMATE_BALLOON;
        if (isBouncing) aniType = window.Tmapv2.MarkerOptions.ANIMATE_BOUNCE;

        const marker = new window.Tmapv2.Marker({
          position: new window.Tmapv2.LatLng(place.latitude, place.longitude),
          map: mapInstanceRef.current!,
          title: place.name,
          icon: iconUrl, // ★ START/END or Category Icon
          iconSize: new window.Tmapv2.Size(32, 32),
          animation: aniType,
          animationLength: 300,
        });

        marker.addListener('click', () => {
          if (routeInfo) return; // 길찾기 중 클릭 무시

          if (!places || places.length === 0) return;

          const prevIdx = activeMarkerIndexRef.current;
          if (prevIdx !== null && prevIdx !== index && markersRef.current[prevIdx]) {
            const prevMarker = markersRef.current[prevIdx];
            prevMarker.setMap(null);
            if (places[prevIdx]) {
              const restored = createMarkerInstance(prevIdx, places[prevIdx], false);
              markersRef.current[prevIdx] = restored;
            }
          }

          marker.setMap(null);
          const bouncing = createMarkerInstance(index, place, true);
          markersRef.current[index] = bouncing;
          activeMarkerIndexRef.current = index;

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
        });

        return marker;
      };

      const addNext = () => {
        if (index >= placesToRender.length) return;
        if (placesToRender[index]) {
          const m = createMarkerInstance(index, placesToRender[index], false);
          markersRef.current.push(m);
        }
        index++;
        timeoutId = setTimeout(addNext, 30);
      };
      addNext();

      return () => clearTimeout(timeoutId);
    }
  }, [places, activeCategory, routeInfo]); // routeInfo 변경 시 아이콘도 바뀜

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
