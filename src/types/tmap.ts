export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  phone: string;
}

export interface ApiResponse {
  singlePlaceResponses: Place[];
}

export interface SelectedPlaceInfo extends Place {
  distanceText: string;
}

// 경로 탐색 결과 정보
export interface RouteInfo {
  totalDistance: number; // 미터
  totalTime: number;     // 초
}

// TMAP 내부 객체 타입들
export interface TmapLatLng {
  _lat: number;
  _lng: number;
  lat: () => number;
  lng: () => number;
}

export interface TmapSize {
  _width: number;
  _height: number;
}

export interface TmapEvent {
  latLng: TmapLatLng;
  zoom?: number;
}

export interface TmapMapInstance {
  setCenter: (latLng: TmapLatLng) => void;
  getBounds: () => any;
  getCenter: () => TmapLatLng;
  getZoom: () => number;
  addListener: (eventType: string, callback: (e: TmapEvent) => void) => void;
  destroy: () => void;
  resize: (width?: string | number, height?: string | number) => void;
  panTo: (latLng: TmapLatLng) => void;
}

export interface TmapMarkerInstance {
  setMap: (map: TmapMapInstance | null) => void;
  setPosition: (latLng: TmapLatLng) => void;
  addListener: (eventType: string, callback: (e: any) => void) => void;
}

export interface TmapPolylineInstance {
  setMap: (map: TmapMapInstance | null) => void;
}

// 전역 객체 선언은 d.ts 파일이나 사용하는 곳에서 선언해도 되지만, 
// 편의상 MapView나 main.d.ts에서 관리하는 것이 일반적입니다. 
// 여기서는 MapView에서 import해서 쓸 수 있도록 인터페이스만 정의합니다.