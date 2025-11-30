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
  giftImageUrl: string;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [betPoint, setBetPoint] = useState<string>('');

  const fetchEventData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_BASE_URL || '';
      const response = await axios.get<ActiveEventResponse>(`${apiUrl}/event/lastest`);
      console.log(response.data);
      setEventData(response.data);
    } catch (error) {
      console.error('Failed to fetch event data:', error);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, []);

  const handleJoinClick = () => {
    setIsModalOpen(true);
    setBetPoint('');
  };

  const handleJoinSubmit = async () => {
    if (!eventData) return;
    const points = Number(betPoint.replace(/[^0-9]/g, '')); // Remove non-numeric chars just in case

    if (points <= 0) {
      alert('1포인트 이상 입력해주세요.');
      return;
    }
    if (points > eventData.userStatus.myPoints) {
      alert('보유 포인트보다 많이 베팅할 수 없습니다.');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_BASE_URL || '';
      // TODO: Verify the exact endpoint for event participation
      await axios.post(`${apiUrl}/event/participate`, { point: points });
      alert('참여가 완료되었습니다!');
      setIsModalOpen(false);
      fetchEventData(); // Refresh data
    } catch (error) {
      console.error('Failed to join event:', error);
      alert('참여 처리에 실패했습니다.');
    }
  };

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
                src={eventData.giftImageUrl}
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

        <button
          type="button"
          onClick={handleJoinClick}
          className="w-full bg-orange-500 text-white font-bold text-lg py-4 rounded-xl active:bg-orange-600 transition-colors shadow-orange-200 shadow-lg"
        >
          이벤트 참여하기
        </button>

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

      {/* Participation Modal */}
      {isModalOpen && eventData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">이벤트 참여</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">내 보유 포인트</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(eventData.userStatus.myPoints)} P
                </p>
              </div>

              <div>
                <label htmlFor="betPoint" className="block text-sm font-medium text-gray-700 mb-2">
                  사용할 포인트
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="betPoint"
                    value={betPoint}
                    onChange={(e) => setBetPoint(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all text-lg font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setBetPoint(eventData.userStatus.myPoints.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-500 bg-orange-50 px-2.5 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    전액사용
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  * 한 번 참여한 포인트는 환불되지 않습니다.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 text-gray-600 font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleJoinSubmit}
                  className="flex-1 py-3.5 text-white font-bold bg-orange-500 rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!betPoint || Number(betPoint) <= 0}
                >
                  참여하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventInfoPage;
