import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

type PointStat = {
  id: string;
  label: string;
  value: string;
  icon: string;
  containerClassName: string;
  iconClassName: string;
  valueClassName?: string;
};

type EventDetail = {
  id: string;
  label: string;
  value: string;
  valueClassName?: string;
  icon?: string;
};

interface ActiveEventResponse {
  giftName: string;
  count: number;
  gifPictureUrl: string;
  period: {
    startDate: string;
    endDate: string;
    announcementDate: string;
  };
  stats: {
    totalAccumulatedPoints: number;
    totalParticipants: number;
  };
  userStatus: {
    myPoints: number;
    winProbability: number;
  };
}

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

const formatNumber = (num: number) => new Intl.NumberFormat('ko-KR').format(num);

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}시 ${minutes}분`;
};

export const EventInfoPage = () => {
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<ActiveEventResponse | null>(null);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_BASE_URL || '';
        const response = await axios.get<ActiveEventResponse>(`${apiUrl}/event/latest`);
        setEventData(response.data);
      } catch (error) {
        console.error('Failed to fetch event data:', error);
      }
    };

    fetchEventData();
  }, []);

  const { pointStats, eventDetails, progressWidth, probabilityLabel } = useMemo(() => {
    if (!eventData) {
      return {
        pointStats: [],
        eventDetails: [],
        progressWidth: '0%',
        probabilityLabel: '0%',
      };
    }

    const { period, stats, userStatus, count } = eventData;

    const pointStatsData: PointStat[] = [
      {
        id: 'myPoints',
        label: '내 보유 포인트',
        value: `${formatNumber(userStatus.myPoints)} P`,
        icon: 'fas fa-user',
        containerClassName: 'bg-blue-50',
        iconClassName: 'bg-blue-500',
      },
      {
        id: 'totalPoints',
        label: '총 모인 포인트',
        value: `${formatNumber(stats.totalAccumulatedPoints)} P`,
        icon: 'fas fa-coins',
        containerClassName: 'bg-green-50',
        iconClassName: 'bg-green-500',
      },
      {
        id: 'participants',
        label: '총 참여자',
        value: `${formatNumber(stats.totalParticipants)} 명`,
        icon: 'fas fa-users',
        containerClassName: 'bg-purple-50',
        iconClassName: 'bg-purple-500',
      },
    ];

    const eventDetailsData: EventDetail[] = [
      {
        id: 'count',
        label: '상품 개수',
        value: `${formatNumber(count)} 개`,
        icon: 'fas fa-gift',
      },
      {
        id: 'period',
        label: '행사 기간',
        value: `${formatDateTime(period.startDate)} - ${formatDateTime(period.endDate)}`,
        icon: 'fas fa-calendar-alt',
      },
      {
        id: 'announcement',
        label: '당첨자 발표',
        value: formatDateTime(period.announcementDate),
        icon: 'fas fa-bullhorn',
      },
    ];

    return {
      pointStats: pointStatsData,
      eventDetails: eventDetailsData,
      progressWidth: `${clampPercentage(userStatus.winProbability)}%`,
      probabilityLabel: `${userStatus.winProbability}%`,
    };
  }, [eventData]);

  const handleBackClick = () => {
    navigate(-1);
  };

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">로딩 중...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 w-full bg-white z-50 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          type="button"
          onClick={handleBackClick}
          aria-label="이전 화면으로 이동"
          className="cursor-pointer"
        >
          <i className="fas fa-arrow-left text-gray-700 text-lg" />
        </button>
        <h1 className="text-lg font-medium text-gray-900">행사정보</h1>
        <button type="button" aria-label="추가 옵션" className="cursor-pointer">
          <i className="fas fa-ellipsis-h text-gray-700 text-lg" />
        </button>
      </header>

      <main className="pt-16 pb-24 px-4 space-y-6">
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="w-48 h-32 mb-4 overflow-hidden rounded-xl">
              <img
                src={eventData.gifPictureUrl}
                alt={eventData.giftName}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{eventData.giftName}</h2>
            <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
              {eventDetails.map((detail) => (
                <div key={detail.id} className="flex items-center gap-2">
                  {detail.icon && <i className={`${detail.icon} w-4 text-center`} aria-hidden />}
                  <span className={detail.valueClassName}>
                    {detail.label} : {detail.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">포인트 현황</h3>
          <div className="space-y-4">
            {pointStats.map((stat) => (
              <div
                key={stat.id}
                className={`flex items-center justify-between p-4 rounded-xl ${stat.containerClassName}`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 ${stat.iconClassName} rounded-full flex items-center justify-center mr-3`}
                  >
                    <i className={`${stat.icon} text-white text-sm`} aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p
                      className={`text-lg font-semibold text-gray-900 ${stat.valueClassName ?? ''}`}
                    >
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">당첨 확률</h3>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-orange-500 mb-2">{probabilityLabel}</div>
            <p className="text-sm text-gray-600">현재 예상 당첨 확률</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-orange-400 to-orange-500 h-3 rounded-full"
              style={{ width: progressWidth }}
              aria-label={`당첨 확률 ${probabilityLabel}`}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default EventInfoPage;
