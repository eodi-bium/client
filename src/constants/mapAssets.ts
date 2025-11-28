import myLocationIcon from '../assets/MY_POINT.png';
import batteryIcon from '../assets/BATTERY.png';
import lightIcon from '../assets/LIGHT.png';
import clothesIcon from '../assets/CLOTHES.png';
// ★ [추가] 출발/도착 마커 아이콘 (이미지가 없다면 기존 것 재사용하거나 다른 파일 연결)
import startIcon from '../assets/MY_POINT.png'; 
import endIcon from '../assets/END.png';   

export const MARKER_IMAGES = {
  MY_LOCATION: myLocationIcon,
  BATTERY: batteryIcon,
  LIGHT: lightIcon,
  DEFAULT: batteryIcon,
  CLOTHES: clothesIcon,
  START: startIcon, // 출발지
  END: endIcon,     // 도착지
};