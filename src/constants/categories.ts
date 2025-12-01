export const RECYCLING_CATEGORIES = [
  {
    code: 'BATTERY',
    id: 'battery',
    label: '폐건전지',
    mapLabel: '배터리',
    icon: 'fas fa-battery-half',
  },
  {
    code: 'LIGHT',
    id: 'light',
    label: '폐형광등',
    mapLabel: '형광등',
    icon: 'fas fa-lightbulb',
  },
  {
    code: 'CLOTHES',
    id: 'clothes',
    label: '의류',
    mapLabel: '의류',
    icon: 'fas fa-tshirt',
  },
] as const;

// 백엔드 코드 타입 (BATTERY | LIGHT | CLOTHES)
export type RecyclingCode = (typeof RECYCLING_CATEGORIES)[number]['code'];

// 지도용 ID 타입 (battery | light | clothes)
export type RecyclingId = (typeof RECYCLING_CATEGORIES)[number]['id'];

// 헬퍼 객체: 코드로 검색 (예: RECYCLING_CONFIG.BATTERY)
export const RECYCLING_CONFIG = RECYCLING_CATEGORIES.reduce(
  (acc, item) => ({ ...acc, [item.code]: item }),
  {} as Record<RecyclingCode, (typeof RECYCLING_CATEGORIES)[number]>
);
