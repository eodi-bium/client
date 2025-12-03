import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAxios } from '../hooks/useAxios';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components';

// ----------------------------------------------------------------------
// 1. 타입 정의 (업데이트됨 - Page 구조 반영)
// ----------------------------------------------------------------------

type PointStat = {
  id: string;
  label: string;
  value: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
};

type EventDetail = {
  id: string;
  label: string;
  value: string;
  valueClassName?: string;
  icon?: string;
};

// [UPDATED] 공통 Page 인터페이스 정의
interface Page<T> {
  content: T[];
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

interface SingleEventResponse {
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
  winner: string | null;
}

// [UPDATED] 전체 응답 구조 (List -> Page)
interface EventResponse {
  events: Page<SingleEventResponse>;
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
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

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
  const axiosInstance = useAxios();
  const { isLoggedIn, isLoading, accessToken } = useAuth();

  // [UPDATED] 상태 관리: 데이터 누적 및 페이징 상태
  const [allEvents, setAllEvents] = useState<SingleEventResponse[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SingleEventResponse | null>(null);

  // 페이징 관련 State
  const [page, setPage] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // 무한 스크롤 Observer Ref
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [userEventStatus, setUserEventStatus] = useState<UserEventStatus | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // 모달 상태
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);

  const [betPoint, setBetPoint] = useState<string>('');
  const [currentPoint, setCurrentPoint] = useState<number>(0);

  // 사용자 ID 추출
  useEffect(() => {
    if (accessToken) {
      const id = getMemberIdFromToken(accessToken);
      setCurrentUserId(id);
    } else {
      setCurrentUserId('');
    }
  }, [accessToken]);

  // [UPDATED] 이벤트 목록 조회 함수 (페이지 기반)
  const fetchEvents = useCallback(
    async (pageNum: number) => {
      // 더 이상 페이지가 없거나 이미 로딩 중이면 중단
      if (!hasNext && pageNum > 0) return;

      setIsFetching(true);
      try {
        const response = await axiosInstance.get<EventResponse>('/event/all', {
          params: {
            page: pageNum,
            size: 10, // 한 번에 가져올 개수 (백엔드 기본값과 맞춰도 됨)
            // sort: 'id,DESC' // 백엔드 @PageableDefault로 설정되어 있으므로 생략 가능
          },
        });

        const pageData = response.data.events;

        setAllEvents((prev) => {
          // 첫 페이지면 덮어쓰기, 아니면 이어붙이기
          if (pageNum === 0) return pageData.content;
          return [...prev, ...pageData.content];
        });

        setHasNext(!pageData.last); // 마지막 페이지가 아니면 true
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setIsFetching(false);
      }
    },
    [axiosInstance, hasNext]
  );

  // [UPDATED] page 상태가 변경될 때마다 데이터 요청
  useEffect(() => {
    fetchEvents(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); // fetchEvents는 의존성에서 제외하여 중복 호출 방지 (혹은 useCallback으로 감싸기)

  // [UPDATED] 마지막 요소 감지용 Ref Callback
  const lastEventRef = useCallback(
    (node: HTMLDivElement) => {
      if (isFetching) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNext) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFetching, hasNext]
  );

  // 선택된 이벤트에 대한 내 정보 조회
  const fetchUserEventStatus = useCallback(async () => {
    if (!selectedEvent?.eventId) return;
    try {
      const response = await axiosInstance.get<UserEventStatus>(
        `/event/${selectedEvent.eventId}/my`
      );
      setUserEventStatus(response.data);
      setCurrentPoint(response.data.myPoints);
    } catch (error) {
      console.error('Failed to fetch user event status:', error);
    }
  }, [axiosInstance, selectedEvent?.eventId]);

  const fetchUserPoints = useCallback(async () => {
    try {
      const response = await axiosInstance.get<{ point: number }>('/event/point');
      setCurrentPoint(response.data.point);
    } catch (error) {
      console.error('Failed to fetch user points:', error);
    }
  }, [axiosInstance]);

  // 상세 페이지 진입 시 내 정보 로드
  useEffect(() => {
    if (!isLoading && isLoggedIn && selectedEvent) {
      fetchUserEventStatus();
    }
  }, [isLoading, isLoggedIn, selectedEvent, fetchUserEventStatus]);

  // 핸들러들
  const handleEventClick = (event: SingleEventResponse) => {
    setSelectedEvent(event);
    window.scrollTo(0, 0); // 상단으로 이동
  };

  const handleBackToList = () => {
    setSelectedEvent(null);
    setUserEventStatus(null);
    // 목록으로 돌아올 때 스크롤 위치 유지나 데이터 리셋이 필요하다면 여기서 처리
    // 현재는 allEvents가 유지되므로 스크롤 위치만 신경 쓰면 됨 (브라우저 기본 동작 활용)
  };

  const handleJoinClick = () => {
    setIsJoinModalOpen(true);
    setBetPoint('');
    fetchUserPoints();
  };

  const handleLoginClick = () => {
    const apiUrl = import.meta.env.VITE_BASE_URL;
    window.location.href = `${apiUrl}/oauth2/authorization/kakao`;
  };

  const handleCheckWinnerClick = () => {
    if (!isLoggedIn) {
      if (window.confirm('당첨 결과를 확인하려면 로그인이 필요합니다.\n로그인 하시겠습니까?')) {
        handleLoginClick();
      }
      return;
    }
    setIsWinnerModalOpen(true);
  };

  const handleJoinSubmit = async () => {
    if (!selectedEvent) return;
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
        eventId: selectedEvent.eventId,
        point: points,
      });
      alert('참여가 완료되었습니다!');
      setIsJoinModalOpen(false);

      // 데이터 갱신 (참여한 이벤트 정보만 업데이트하거나, 목록을 새로고침)
      // 여기서는 간편하게 현재 페이지만 리프레시하거나 전체를 다시 불러옴
      // UX상 전체 리로드는 스크롤이 튀므로, fetchUserEventStatus만 호출하고
      // 목록 데이터 갱신은 나중에 생각하거나 Optimistic Update 적용 권장
      fetchUserEventStatus();
    } catch (error) {
      console.error('Failed to join event:', error);
      alert('참여 처리에 실패했습니다.');
    }
  };

  // 상세 페이지용 데이터 가공 (기존 로직 유지)
  const { pointStats, eventDetails, progressWidth, probabilityLabel, isEventClosed, isMeWinner } =
    useMemo(() => {
      if (!selectedEvent) {
        return {
          pointStats: [],
          eventDetails: [],
          progressWidth: '0%',
          probabilityLabel: '0%',
          isEventClosed: false,
          isMeWinner: false,
        };
      }

      const { period, stats, count, winner } = selectedEvent;
      const closed = !!winner;
      const winnersList = winner ? winner.split(',') : [];
      const meWinner = !!(isLoggedIn && currentUserId && winnersList.includes(currentUserId));

      const pointStatsData: PointStat[] = [
        ...(isLoggedIn && userEventStatus
          ? [
              {
                id: 'myPoints',
                label: '내 사용 포인트',
                value: `${formatNumber(userEventStatus.myPoints)} P`,
                icon: 'fas fa-user',
                iconBgColor: 'bg-blue-50',
                iconColor: 'text-blue-500',
              },
            ]
          : []),
        {
          id: 'totalPoints',
          label: '총 모인 포인트',
          value: `${formatNumber(stats.totalAccumulatedPoints)} P`,
          icon: 'fas fa-coins',
          iconBgColor: 'bg-green-50',
          iconColor: 'text-green-600',
        },
        {
          id: 'participants',
          label: '총 참여자',
          value: `${formatNumber(stats.totalParticipants)} 명`,
          icon: 'fas fa-users',
          iconBgColor: 'bg-purple-50',
          iconColor: 'text-purple-500',
        },
      ];

      let eventDetailsData: EventDetail[] = [
        {
          id: 'count',
          label: '상품 수량',
          value: `${formatNumber(count)}개`,
          icon: 'fas fa-gift',
        },
      ];

      if (closed) {
        eventDetailsData.push({
          id: 'status',
          label: '상태',
          value: '마감',
          icon: 'fas fa-flag-checkered',
          valueClassName: 'text-red-500 font-bold',
        });
      } else {
        eventDetailsData.push(
          {
            id: 'period',
            label: '응모 기간',
            value: `${formatDateTime(period.startDate)} ~ ${formatDateTime(period.endDate)}`,
            icon: 'far fa-calendar-alt',
          },
          {
            id: 'announcement',
            label: '발표일',
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
        isEventClosed: closed,
        isMeWinner: meWinner,
      };
    }, [selectedEvent, userEventStatus, isLoggedIn, currentUserId]);

  // ======================================================================
  // 렌더링 시작
  // ======================================================================

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans">
      <Header />

      <main className="px-5 w-full max-w-5xl mx-auto space-y-6 pt-20">
        {/* [VIEW 1] 이벤트 목록 화면 (selectedEvent가 없을 때) */}
        {!selectedEvent && (
          <div className="animate-fade-in-up">
            <div className="mb-8 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">진행 중인 이벤트 🎁</h2>
              <p className="text-gray-500">포인트를 사용하여 상품에 응모해보세요!</p>
            </div>

            {allEvents.length === 0 && !isFetching ? (
              <div className="py-20 text-center text-gray-400 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                <i className="ri-inbox-archive-line text-4xl mb-3 block"></i>
                <p>현재 진행 중인 이벤트가 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {allEvents.map((event, index) => {
                  const isClosed = !!event.winner;
                  // [UPDATED] 마지막 요소에 ref 할당하여 무한 스크롤 트리거
                  const isLastElement = index === allEvents.length - 1;

                  return (
                    <div
                      key={`${event.eventId}-${index}`} // Key 중복 방지 (데이터 중복 대비)
                      ref={isLastElement ? lastEventRef : null}
                      onClick={() => handleEventClick(event)}
                      className="group bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                    >
                      {/* 카드 이미지 */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        <img
                          src={event.giftImageUrl}
                          alt={event.giftName}
                          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isClosed ? 'grayscale opacity-80' : ''}`}
                        />
                        {/* 상태 뱃지 */}
                        <div className="absolute top-3 right-3">
                          {isClosed ? (
                            <span className="bg-gray-800/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
                              종료됨
                            </span>
                          ) : (
                            <span className="bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">
                              진행중
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 카드 내용 */}
                      <div className="p-5">
                        <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1 group-hover:text-green-600 transition-colors">
                          {event.giftName}
                        </h3>
                        <div className="space-y-2 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <i className="ri-calendar-event-line text-green-500"></i>
                            <span>~ {formatDateTime(event.period.endDate)} 마감</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <i className="ri-group-line text-green-500"></i>
                            <span>{formatNumber(event.stats.totalParticipants)}명 참여 중</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 로딩 인디케이터 (하단) */}
            {isFetching && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}

        {/* [VIEW 2] 상세 정보 화면 (selectedEvent가 있을 때) - 기존 코드 유지 */}
        {selectedEvent && (
          <div className="animate-slide-up">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={handleBackToList}
              className="mb-6 flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors font-medium"
            >
              <i className="fas fa-arrow-left"></i> 목록으로 돌아가기
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* 좌측: 이미지 및 타이틀 */}
              <section className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] overflow-hidden h-full">
                <div className="relative bg-gradient-to-br from-green-50 to-green-100/50 p-6 flex justify-center items-center min-h-[300px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl"></div>
                  <div className="relative w-full max-w-2xl aspect-video bg-white rounded-2xl shadow-sm border-4 border-white overflow-hidden">
                    <img
                      src={selectedEvent.giftImageUrl}
                      alt={selectedEvent.giftName}
                      className={`w-full h-full object-cover transform hover:scale-105 transition-transform duration-500 ${isEventClosed ? 'grayscale opacity-70' : ''}`}
                    />
                    {isEventClosed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-white font-bold text-xl border-2 border-white px-4 py-1 rounded-lg">
                          종료된 행사
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2 leading-tight">
                    {selectedEvent.giftName}
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {eventDetails.map((detail) => (
                      <div
                        key={detail.id}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-medium text-gray-600 border border-gray-100"
                      >
                        {detail.icon && <i className={`${detail.icon} mr-1.5 text-green-500`}></i>}
                        <span className={detail.valueClassName}>{detail.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 우측: 포인트, 확률, 버튼 */}
              <div className="flex flex-col gap-6 h-full justify-between">
                <section className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-chart-pie text-green-500"></i> 포인트 현황
                  </h3>
                  <div className="space-y-3">
                    {pointStats.map((stat) => (
                      <div
                        key={stat.id}
                        className="flex items-center justify-between bg-gray-50/80 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 ${stat.iconBgColor} rounded-full flex items-center justify-center shadow-sm`}
                          >
                            <i className={`${stat.icon} ${stat.iconColor} text-lg`} />
                          </div>
                          <span className="text-gray-600 font-medium text-sm">{stat.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-800 font-bold text-lg">{stat.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {isLoggedIn && userEventStatus && (
                  <section className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-end mb-3">
                      <h3 className="text-lg font-bold text-gray-800">예상 당첨 확률</h3>
                      <span className="text-2xl font-extrabold text-green-600">
                        {probabilityLabel}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-green-300 to-green-600 h-full rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: progressWidth }}
                      >
                        <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium px-1">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </section>
                )}

                <div className="mt-auto pt-2">
                  {isEventClosed ? (
                    <button
                      type="button"
                      onClick={handleCheckWinnerClick}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-[20px] shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-trophy text-lg mb-0.5"></i>
                      당첨 결과 확인하기
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={isLoggedIn ? handleJoinClick : handleLoginClick}
                      className={`w-full py-4 text-white font-bold rounded-[20px] shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                        !isLoggedIn
                          ? 'bg-[#FEE500] hover:bg-[#FDD835] text-[#3c1e1e] shadow-yellow-100'
                          : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                      }`}
                    >
                      {!isLoggedIn ? (
                        <>
                          <i className="ri-kakao-talk-fill text-xl"></i>
                          로그인하고 참여하기
                        </>
                      ) : (
                        <>
                          <i className="fas fa-hand-holding-heart text-lg"></i>
                          이벤트 참여하기
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ---------------------------------------------------------------------- */}
      {/* Modals (기존과 동일) */}
      {/* ---------------------------------------------------------------------- */}

      {/* 1. 참여 Modal */}
      {isJoinModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">이벤트 참여</h3>
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-1">현재 내 포인트</p>
                <p className="text-2xl font-extrabold text-gray-900">
                  {formatNumber(currentPoint)} P
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 px-1">
                  얼마나 사용할까요?
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={betPoint}
                    onChange={(e) => setBetPoint(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all text-lg font-bold text-gray-800 placeholder:font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setBetPoint(currentPoint.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-600 bg-green-100 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    전액
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-400 px-1">
                  * 당첨되지 않은 포인트는 반환됩니다.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="flex-1 py-4 text-gray-500 font-bold bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleJoinSubmit}
                  className="flex-1 py-4 text-white font-bold bg-green-600 rounded-2xl hover:bg-green-700 shadow-lg shadow-green-200 transition-colors disabled:opacity-50"
                  disabled={!betPoint || Number(betPoint) <= 0}
                >
                  참여하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. 당첨 확인 Modal */}
      {isWinnerModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-6">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative animate-bounce-in text-center overflow-hidden">
            {isMeWinner && (
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-50 to-white -z-10"></div>
            )}
            <button
              type="button"
              onClick={() => setIsWinnerModalOpen(false)}
              className="absolute top-5 right-5 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <i className="fas fa-times text-xl" />
            </button>
            {isMeWinner ? (
              <div className="py-4">
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <i className="fas fa-trophy text-5xl text-yellow-500 animate-pulse drop-shadow-sm"></i>
                </div>
                <h3 className="text-2xl font-extrabold text-gray-800 mb-2">당첨을 축하해요!</h3>
                <p className="text-gray-600 mb-8 leading-relaxed text-sm">
                  이번 행사의 주인공은 바로
                  <br />
                  <span className="text-green-600 font-bold text-lg">회원님</span>입니다! 🎉
                </p>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 mb-6 text-xs text-green-700 font-medium">
                  관리자에게 연락하여 상품 수령 방법을 안내받으세요.
                </div>
              </div>
            ) : (
              <div className="py-4">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-heart-broken text-4xl text-gray-400"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">아쉬워요...</h3>
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                  이번에는 당첨되지 않았어요.
                  <br />
                  다음 기회에 다시 도전해보세요!
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsWinnerModalOpen(false)}
              className={`w-full py-4 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] ${isMeWinner ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-gray-800 hover:bg-gray-900 shadow-gray-200'}`}
            >
              확인완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventInfoPage;
