import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import deviceImage from '../assets/onboarding-device.jpg';

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
};

type ParticipationHistory = {
  id: string;
  title: string;
  date: string;
  amount: string;
  icon: string;
  iconClassName: string;
  amountClassName: string;
};

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

export const EventInfoPage = () => {
  const navigate = useNavigate();

  const { eventMeta, pointStats, eventDetails, progressWidth, probabilityLabel } = useMemo(() => {
    const eventMetaData = {
      name: '맥북 프로',
      schedule: '2024년 12월 행사',
      winProbability: 2.7,
      minPoints: '100 P',
      announcementDate: '2025.01.02',
      remainingTime: '12일 5시간',
    };

    const pointStatsData: PointStat[] = [
      {
        id: 'myPoints',
        label: '내 보유 포인트',
        value: '1,250 P',
        icon: 'fas fa-user',
        containerClassName: 'bg-blue-50',
        iconClassName: 'bg-blue-500',
      },
      {
        id: 'totalPoints',
        label: '총 모인 포인트',
        value: '45,680 P',
        icon: 'fas fa-coins',
        containerClassName: 'bg-green-50',
        iconClassName: 'bg-green-500',
      },
      {
        id: 'participants',
        label: '총 참여자',
        value: '1,847 명',
        icon: 'fas fa-users',
        containerClassName: 'bg-purple-50',
        iconClassName: 'bg-purple-500',
      },
    ];

    const eventDetailsData: EventDetail[] = [
      { id: 'period', label: '행사 기간', value: '2024.12.01 - 2024.12.31' },
      { id: 'minPoint', label: '최소 참여 포인트', value: eventMetaData.minPoints },
      { id: 'announcement', label: '당첨자 발표', value: eventMetaData.announcementDate },
      {
        id: 'remainingTime',
        label: '남은 시간',
        value: eventMetaData.remainingTime,
        valueClassName: 'text-orange-500',
      },
    ];

    const participationHistoryData: ParticipationHistory[] = [
      {
        id: 'history-1',
        title: '포인트 참여',
        date: '2024.11.15 14:30',
        amount: '+500 P',
        icon: 'fas fa-plus',
        iconClassName: 'bg-blue-500',
        amountClassName: 'text-blue-600',
      },
      {
        id: 'history-2',
        title: '포인트 참여',
        date: '2024.11.10 09:15',
        amount: '+300 P',
        icon: 'fas fa-plus',
        iconClassName: 'bg-green-500',
        amountClassName: 'text-green-600',
      },
    ];

    return {
      eventMeta: eventMetaData,
      pointStats: pointStatsData,
      eventDetails: eventDetailsData,
      participationHistory: participationHistoryData,
      progressWidth: `${clampPercentage(eventMetaData.winProbability)}%`,
      probabilityLabel: `${eventMetaData.winProbability}%`,
    };
  }, []);

  const handleBackClick = () => {
    navigate(-1);
  };

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
                src={deviceImage}
                alt={eventMeta.name}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{eventMeta.name}</h2>
            <div className="flex items-center text-sm text-gray-500">
              <i className="fas fa-calendar-alt mr-1" aria-hidden />
              <span>{eventMeta.schedule}</span>
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

        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">행사 정보</h3>
          <div className="space-y-3">
            {eventDetails.map((detail) => (
              <div key={detail.id} className="flex justify-between">
                <span className="text-gray-600">{detail.label}</span>
                <span className={`text-gray-900 font-medium ${detail.valueClassName ?? ''}`}>
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default EventInfoPage;
