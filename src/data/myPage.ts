export type RecyclingHistoryEntry = {
  id: string;
  date: string;
  type: string;
  quantity: number;
  points: number;
  event: string;
};

export const myPageData = {
  userId: 'eco_user_2024',
  totalPoints: 1250,
  history: [
    {
      id: 'history-1',
      date: '2024-11-18',
      type: '플라스틱',
      quantity: 5,
      points: 50,
      event: '2024 겨울 환경 캠페인',
    },
    {
      id: 'history-2',
      date: '2024-11-17',
      type: '종이',
      quantity: 8,
      points: 80,
      event: '2024 겨울 환경 캠페인',
    },
    {
      id: 'history-3',
      date: '2024-11-16',
      type: '캔',
      quantity: 3,
      points: 45,
      event: '지구를 지키는 분리수거 챌린지',
    },
    {
      id: 'history-4',
      date: '2024-11-15',
      type: '유리병',
      quantity: 2,
      points: 30,
      event: '지구를 지키는 분리수거 챌린지',
    },
    {
      id: 'history-5',
      date: '2024-11-14',
      type: '플라스틱',
      quantity: 7,
      points: 70,
      event: '그린 라이프 실천 이벤트',
    },
  ] satisfies RecyclingHistoryEntry[],
};

export const recyclingTypeIconMap: Record<string, string> = {
  플라스틱: 'fas fa-recycle',
  종이: 'fas fa-file-alt',
  캔: 'fas fa-wine-bottle',
  유리병: 'fas fa-wine-glass',
};

export const eventBadgeStyleMap: Record<string, string> = {
  '2024 겨울 환경 캠페인': 'bg-blue-100 text-blue-700',
  '지구를 지키는 분리수거 챌린지': 'bg-green-100 text-green-700',
  '그린 라이프 실천 이벤트': 'bg-purple-100 text-purple-700',
};

