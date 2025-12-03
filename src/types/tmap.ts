export interface Place {
  id?: number | string;
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
  setRotate: (angle: number) => void;
}

export interface TmapMarkerInstance {
  setMap: (map: TmapMapInstance | null) => void;
  setPosition: (latLng: TmapLatLng) => void;
  addListener: (eventType: string, callback: (e: any) => void) => void;
  setIcon: (icon: string) => void;
}

export interface TmapPolylineInstance {
  setMap: (map: TmapMapInstance | null) => void;
}

export interface RouteFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][];
  };
  properties: {
    index: number;
    name: string;
    description: string; // "100m 앞 우회전" 같은 안내 문구
    turnType?: number;   // 회전 타입 (12: 우회전, 13: 좌회전 등)
    totalDistance?: number;
    totalTime?: number;
    // 필요한 속성 추가
  };
}
