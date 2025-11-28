// Haversine 거리 계산
export const getDistanceFromLatLonInMeters = (
  lat1: number, lng1: number, lat2: number, lng2: number
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

// 카테고리 변환
export const getRecyclingType = (category: string) => {
  switch (category) {
    case 'battery': return 'BATTERY';
    case 'light': return 'LIGHT';
    case 'clothes': return 'CLOTHES';
    default: return 'BATTERY';
  }
};

// 초 -> "00분" 형식 변환
export const formatTime = (seconds: number) => {
  const min = Math.ceil(seconds / 60);
  return `${min}분`;
};

// 미터 -> "1.2km" 형식 변환
export const formatDistance = (meters: number) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${meters}m`;
};