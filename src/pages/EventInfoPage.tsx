import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAxios } from '../hooks/useAxios';
import { useAuth } from '../context/AuthContext';

// ----------------------------------------------------------------------
// 1. 타입 정의
// ----------------------------------------------------------------------

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
  eventId: number;
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
  winner?: string | null;
}

interface UserEventStatus {
  myPoints: number;
  winProbability: number;
}

// ----------------------------------------------------------------------
// 2. 헬퍼 함수들
// ----------------------------------------------------------------------

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

// [추가] JWT 토큰에서 사용자 ID 추출하는 함수
const getMemberIdFromToken = (token: string): string => {
  if (!token) return '';
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.userId || payload.sub || '';
  } catch (e) {
    console.error('Failed to parse JWT', e);
    return '';
  }
};

// ----------------------------------------------------------------------
// 3. 컴포넌트 구현
// ----------------------------------------------------------------------

export const EventInfoPage = () => {
  const navigate = useNavigate();
  const axiosInstance = useAxios();
  const { isLoggedIn, isLoading, accessToken } = useAuth(); // accessToken 가져오기

  const [eventData, setEventData] = useState<ActiveEventResponse | null>(null);
  const [userEventStatus, setUserEventStatus] = useState<UserEventStatus | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>(''); // [추가] 현재 사용자 ID 상태

  // 모달 상태 관리
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);

  const [betPoint, setBetPoint] = useState<string>('');
  const [currentPoint, setCurrentPoint] = useState<number>(0);

  // [추가] 토큰이 변경될 때마다 사용자 ID 업데이트
  useEffect(() => {
    if (accessToken) {
      const id = getMemberIdFromToken(accessToken);
      setCurrentUserId(id);
    } else {
      setCurrentUserId('');
    }
  }, [accessToken]);

  const fetchUserPoints = useCallback(async () => {
    try {
      const response = await axiosInstance.get<{ point: number }>('/event/point');
      setCurrentPoint(response.data.point);
    } catch (error) {
      console.error('Failed to fetch user points:', error);
    }
  }, [axiosInstance]);

  const fetchUserEventStatus = useCallback(async () => {
    if (!eventData?.eventId) return;
    try {
      const response = await axiosInstance.get<UserEventStatus>(`/event/${eventData.eventId}/my`);
      setUserEventStatus(response.data);
      setCurrentPoint(response.data.myPoints);
    } catch (error) {
      console.error('Failed to fetch user event status:', error);
    }
  }, [axiosInstance, eventData?.eventId]);

  const fetchEventData = useCallback(async () => {
    try {
      const response = await axiosInstance.get<ActiveEventResponse>('/event/lastest');
      console.log(response.data);
      setEventData(response.data);
    } catch (error) {
      console.error('Failed to fetch event data:', error);
      alert('현재 진행중인 행사가 없습니다.');
      navigate('/');
    }
  }, [axiosInstance, navigate]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  useEffect(() => {
    if (!isLoading && isLoggedIn && eventData?.eventId) {
      fetchUserEventStatus();
    }
  }, [isLoading, isLoggedIn, eventData?.eventId, fetchUserEventStatus]);

  const handleJoinClick = () => {
    setIsJoinModalOpen(true);
    setBetPoint('');
    fetchUserPoints();
  };

  const handleCheckWinnerClick = () => {
    // 로그인 안 된 상태에서 확인하려고 하면 로그인 유도
    if (!isLoggedIn) {
      if (window.confirm('당첨 결과를 확인하려면 로그인이 필요합니다.\n로그인 하시겠습니까?')) {
        handleLoginClick();
      }
      return;
    }
    setIsWinnerModalOpen(true);
  };

  const handleJoinSubmit = async () => {
    if (!eventData) return;
    const points = Number(betPoint.replace(/[^0-9]/g, ''));

    if (points <= 0) {
      alert('1포인트 이상 입력해주세요.');
      return;
    }
    if (points > currentPoint) {
      alert('보유 포인트보다 많이 베팅할 수 없습니다.');
      return;
    }

    try {
      await axiosInstance.post('/event/join', {
        eventId: eventData.eventId,
        point: points,
      });
      alert('참여가 완료되었습니다!');
      setIsJoinModalOpen(false);
      fetchEventData();
      fetchUserEventStatus();
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

    const { period, stats, count, winner } = eventData;

    const pointStatsData: PointStat[] = [
      ...(isLoggedIn && userEventStatus
        ? [
            {
              id: 'myPoints',
              label: '내 사용 포인트',
              value: `${formatNumber(userEventStatus.myPoints)} P`,
              icon: 'fas fa-user',
              containerClassName: 'bg-blue-50',
              iconClassName: 'bg-blue-500',
            },
          ]
        : []),
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

    let eventDetailsData: EventDetail[] = [
      {
        id: 'count',
        label: '상품 개수',
        value: `${formatNumber(count)} 개`,
        icon: 'fas fa-gift',
      },
    ];

    if (winner) {
      eventDetailsData.push({
        id: 'status',
        label: '행사 상태',
        value: '행사 마감',
        icon: 'fas fa-flag-checkered',
        valueClassName: 'text-red-500 font-bold',
      });
    } else {
      eventDetailsData.push(
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
        }
      );
    }

    const winProbability = userEventStatus ? userEventStatus.winProbability : 0;

    return {
      pointStats: pointStatsData,
      eventDetails: eventDetailsData,
      progressWidth: `${clampPercentage(winProbability)}%`,
      probabilityLabel: `${winProbability}%`,
    };
  }, [eventData, userEventStatus, isLoggedIn]);

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleLoginClick = () => {
    const apiUrl = import.meta.env.VITE_BASE_URL;
    window.location.href = `${apiUrl}/oauth2/authorization/kakao`;
  };

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <i className="fas fa-spinner fa-spin text-2xl text-orange-500"></i>
          <span className="text-gray-500">정보를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  const isEventClosed = !!eventData.winner;
  // [추가] 내가 당첨자인지 여부 확인
  const winners = eventData.winner ? eventData.winner.split(',') : [];
  const isMeWinner = !!(isLoggedIn && currentUserId && winners.includes(currentUserId));
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
            <div className="w-48 h-32 mb-4 overflow-hidden rounded-xl bg-gray-100">
              <img
                src={eventData.giftImageUrl}
                alt={eventData.giftName}
                className={`w-full h-full object-cover object-top ${isEventClosed ? 'grayscale opacity-80' : ''}`}
                loading="lazy"
              />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{eventData.giftName}</h2>
            <div className="flex flex-col items-center gap-2 text-sm text-gray-500 w-full">
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

        {isEventClosed ? (
          <button
            type="button"
            onClick={handleCheckWinnerClick}
            className="w-full font-bold text-lg py-4 rounded-xl transition-colors shadow-lg bg-indigo-500 text-white active:bg-indigo-600 shadow-indigo-200"
          >
            <i className="fas fa-trophy mr-2"></i>
            당첨 결과 확인하기
          </button>
        ) : (
          <button
            type="button"
            onClick={isLoggedIn ? handleJoinClick : handleLoginClick}
            className={`w-full font-bold text-lg py-4 rounded-xl transition-colors shadow-lg ${
              !isLoggedIn
                ? 'bg-yellow-400 text-gray-900 active:bg-yellow-500 shadow-yellow-200'
                : 'bg-orange-500 text-white active:bg-orange-600 shadow-orange-200'
            }`}
          >
            {!isLoggedIn ? '로그인해서 참여하기' : '이벤트 참여하기'}
          </button>
        )}

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

        {isLoggedIn && userEventStatus && (
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
        )}
      </main>

      {/* Participation Modal */}
      {isJoinModalOpen && eventData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">이벤트 참여</h3>
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">내 보유 포인트</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(currentPoint)} P</p>
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
                    onClick={() => setBetPoint(currentPoint.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-500 bg-orange-50 px-2.5 py-1.5 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={() => setIsJoinModalOpen(false)}
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

      {/* [수정] My Result Modal (나의 당첨 여부 확인) */}
      {isWinnerModalOpen && eventData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity px-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-8 shadow-2xl relative animate-bounce-in text-center">
            <button
              type="button"
              onClick={() => setIsWinnerModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-xl" />
            </button>

            {/* 당첨 여부에 따른 UI 분기 */}
            {isMeWinner ? (
              <>
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-trophy text-4xl text-yellow-500 animate-pulse"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">축하합니다!</h3>
                <p className="text-gray-600 mb-6">
                  회원님이 이번 행사의 <br />
                  <span className="text-indigo-600 font-bold">주인공</span>이 되셨습니다!
                </p>
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-6">
                  <p className="text-sm font-semibold text-yellow-700">
                    관리자에게 문의하여 상품을 수령하세요.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-sad-tear text-4xl text-gray-400"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">아쉽네요...</h3>
                <p className="text-gray-600 mb-6">
                  이번 행사에는 당첨되지 않았습니다.
                  <br />
                  다음 기회를 노려보세요!
                </p>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsWinnerModalOpen(false)}
              className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-colors ${
                isMeWinner
                  ? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200'
                  : 'bg-gray-500 hover:bg-gray-600 shadow-gray-200'
              }`}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventInfoPage;
