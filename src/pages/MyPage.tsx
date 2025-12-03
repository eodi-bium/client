import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { RECYCLING_CONFIG } from '../constants/categories';
import type { RecyclingCode } from '../constants/categories';
import { useAuth } from '../context/AuthContext';
import { useAxios } from '../hooks/useAxios';

// ----------------------------------------------------------------------
// 1. API 응답 타입 정의 (Slice 타입 추가 및 구조 변경)
// ----------------------------------------------------------------------

// 백엔드의 Pageable/Slice 구조에 맞춘 인터페이스
interface Slice<T> {
  content: T[];
  last: boolean;
  number: number;
  size: number;
  first: boolean;
  empty: boolean;
  numberOfElements: number;
}

interface RecyclingRecord {
  recyclingType: string;
  count: number;
  point: number;
}

interface EventRecord {
  name: string;
  giftCount: number;
  startDate: string;
  endDate: string;
  announceDate: string;
  myPoint: number;
}

interface MemberInfoResponse {
  nickname: string;
  records: RecyclingRecord[]; // List (통계용)
  eventRecords: Slice<EventRecord>; // Slice (무한 스크롤용)
}

// ----------------------------------------------------------------------
// 2. 헬퍼 함수들 (기존 유지)
// ----------------------------------------------------------------------

const getTypeIcon = (type: string) =>
  RECYCLING_CONFIG[type as RecyclingCode]?.icon ?? 'fas fa-trash-alt';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
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

export const MyPage = () => {
  const { accessToken, isLoggedIn, isLoading: isAuthLoading, logout } = useAuth();
  const axios = useAxios();

  const [memberInfo, setMemberInfo] = useState<MemberInfoResponse | null>(null);
  const [memberId, setMemberId] = useState<string>('');

  // 무한 스크롤을 위한 State
  const [eventList, setEventList] = useState<EventRecord[]>([]); // 누적된 이벤트 리스트
  const [hasNextPage, setHasNextPage] = useState<boolean>(false); // 다음 페이지 존재 여부
  const [currentPage, setCurrentPage] = useState<number>(0); // 현재 페이지 번호
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false); // 추가 로딩 중 상태
  const observerRef = useRef<IntersectionObserver | null>(null); // 무한 스크롤 감지용 Ref

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);

  // 초기 데이터 로딩 (/memberInfo)
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isLoggedIn || !accessToken) return;

    const fetchData = async () => {
      setIsInitialLoading(true);
      try {
        const id = getMemberIdFromToken(accessToken);
        setMemberId(id);

        const response = await axios.get('/memberInfo');
        const data: MemberInfoResponse = response.data.body || response.data;

        setMemberInfo(data);

        // [중요] 초기 로딩 시 첫 페이지(Slice) 데이터를 이벤트 리스트에 설정
        if (data.eventRecords) {
          setEventList(data.eventRecords.content);
          setHasNextPage(!data.eventRecords.last);
          setCurrentPage(data.eventRecords.number);
        }
      } catch (error: any) {
        console.error('회원 정보 요청 실패:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchData();
  }, [accessToken, isLoggedIn, isAuthLoading, axios]);

  // 추가 데이터 로딩 함수 (다음 페이지 호출)
  const fetchMoreEvents = useCallback(async () => {
    if (!accessToken || isFetchingMore || !hasNextPage) return;
    setIsFetchingMore(true);
    try {
      // [주의] 백엔드에 별도의 이벤트 페이징 API (/events)가 필요합니다.
      // MemberInfoController와 별개로 EventController에 Pageable을 받는 엔드포인트가 있다고 가정합니다.
      const nextPage = currentPage + 1;
      const response = await axios.get('/memberEvents', {
        // 혹은 /member/events
        params: {
          page: nextPage,
          size: 20, // 백엔드 기본값과 동일하게 설정
          // sort는 백엔드 쿼리에서 처리하므로 생략 가능
        },
      });

      const newSlice: Slice<EventRecord> = response.data.body || response.data;

      // 기존 리스트에 새 데이터 추가
      setEventList((prev) => [...prev, ...newSlice.content]);
      setHasNextPage(!newSlice.last);
      setCurrentPage(newSlice.number);
    } catch (error) {
      console.error('이벤트 더 불러오기 실패:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, hasNextPage, currentPage, axios, accessToken]);
  // IntersectionObserver 설정 (마지막 요소 감지)
  const lastEventElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isFetchingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchMoreEvents();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFetchingMore, hasNextPage, fetchMoreEvents]
  );

  const totalRecyclingPoints = useMemo(() => {
    if (!memberInfo || !memberInfo.records) return 0;
    return memberInfo.records.reduce((acc, record) => acc + record.point, 0);
  }, [memberInfo]);

  const handleLoginClick = () => {
    const apiUrl = import.meta.env.VITE_BASE_URL;
    window.location.href = `${apiUrl}/oauth2/authorization/kakao`;
  };

  const handleLogout = async () => {
    if (!window.confirm('정말 로그아웃 하시겠습니까?')) return;
    try {
      await axios.post('/member/logout');
    } catch (error) {
      console.error('로그아웃 요청 실패:', error);
    } finally {
      logout();
      window.location.href = '/';
    }
  };

  // 로딩 화면
  if (isAuthLoading || isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
          <div className="text-sm font-medium text-gray-500">정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  // 비로그인 화면
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] px-6">
        <div className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-leaf-fill text-4xl text-green-500"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">로그인이 필요해요</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            나의 환경 보호 기록을 확인하려면
            <br />
            로그인을 진행해주세요.
          </p>
          <button
            onClick={handleLoginClick}
            className="w-full py-4 px-4 bg-[#FEE500] hover:bg-[#FDD835] text-[#3c1e1e] font-bold rounded-2xl transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <i className="ri-kakao-talk-fill text-xl"></i>
            카카오로 3초 만에 시작하기
          </button>
        </div>
      </div>
    );
  }

  const hasEventHistory = eventList.length > 0;

  // 메인 UI 시작
  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans">
      {/* 1. 헤더 */}
      <header className="sticky top-0 bg-[#F8F9FA]/90 backdrop-blur-sm z-10 px-6 py-4 flex items-center justify-center relative border-b border-gray-200/50">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          마이페이지 <i className="fas fa-leaf text-green-500 text-sm" />
        </h1>
      </header>

      <main className="px-5 w-full max-w-5xl mx-auto space-y-6 pt-6">
        {/* 2. 프로필 카드 */}
        <section className="bg-white rounded-[24px] border border-green-500 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] p-6 relative overflow-hidden">
          <button
            onClick={handleLogout}
            className="absolute top-5 right-5 text-gray-400 hover:text-red-500 text-xs font-medium flex items-center gap-1 transition-colors z-10"
          >
            로그아웃 <i className="fas fa-sign-out-alt" />
          </button>

          <div className="flex flex-col items-center text-center mt-2">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center mb-4 relative">
              <i className="fas fa-user text-green-600 text-3xl" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center border border-gray-100">
                <i className="fas fa-leaf text-green-500 text-xs"></i>
              </div>
            </div>

            <h2 className="text-gray-500 text-sm font-medium mb-1">내 닉네임</h2>
            <p className="text-2xl font-bold text-gray-800 mb-6">
              {memberInfo?.nickname || '닉네임 없음'}
            </p>

            {memberId && (
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <QRCodeCanvas
                  value={`${window.location.origin}/process-qr?user_id=${memberId}`}
                  size={100}
                  fgColor="#333"
                  bgColor="transparent"
                />
                <p className="text-[10px] text-gray-400 mt-2">나의 QR 코드</p>
              </div>
            )}
          </div>
        </section>

        {/* 3. 포인트 및 분리수거 현황 카드 */}
        <section className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 pb-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-600 text-2xl">
              <i className="fas fa-coins" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">총 획득 포인트</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-green-600">
                {totalRecyclingPoints.toLocaleString()}
              </span>
              <span className="text-gray-400 font-medium">포인트</span>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-sm font-semibold text-gray-400 mb-4 pl-1">분리수거 기록 현황</h4>

              <div className="space-y-3">
                {memberInfo?.records && memberInfo.records.length > 0 ? (
                  memberInfo.records.map((record, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50/80 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm text-lg">
                          <i className={getTypeIcon(record.recyclingType)} />
                        </div>
                        <span className="text-gray-700 font-semibold">
                          {RECYCLING_CONFIG[record.recyclingType as RecyclingCode]?.label ||
                            record.recyclingType}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-800 font-bold">{record.count}개</div>
                        <div className="text-xs text-green-500 font-medium">+{record.point}p</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-2xl text-gray-400 text-sm">
                    아직 기록이 없어요 <i className="far fa-sad-tear ml-1"></i>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4. 이벤트 참여 내역 (무한 스크롤 적용) */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
            <i className="fas fa-history text-green-500" />
            <h3 className="text-lg font-bold text-gray-800">이벤트 참여 내역</h3>
          </div>

          {!hasEventHistory ? (
            <div className="bg-white rounded-[24px] p-12 text-center shadow-sm border border-gray-100">
              <i className="fas fa-inbox text-gray-200 text-4xl mb-3" />
              <p className="text-gray-400 text-sm">참여한 이벤트가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* eventList를 기반으로 렌더링 */}
              {eventList.map((event, index) => {
                // 마지막 요소에 ref 할당 (Observer 트리거용)
                const isLastElement = index === eventList.length - 1;
                return (
                  <article
                    key={`${event.name}-${index}`}
                    ref={isLastElement ? lastEventElementRef : null}
                    className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:border-green-200 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="inline-block px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-lg mb-2">
                          응모완료
                        </span>
                        <h4 className="font-bold text-gray-800 text-lg">{event.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="block text-xl font-bold text-green-600">
                          {event.giftCount}개
                        </span>
                        <span className="text-xs text-gray-400">상품 수량</span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between mt-4 pt-4 border-t border-dashed border-gray-100">
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>발표일: {formatDate(event.announceDate)}</p>
                        <p>
                          참여 기간: {formatDate(event.startDate)} ~ {formatDate(event.endDate)}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-gray-600">-{event.myPoint} P</div>
                    </div>
                  </article>
                );
              })}

              {/* 로딩 인디케이터 (추가 로딩 중일 때 표시) */}
              {isFetchingMore && (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MyPage;
