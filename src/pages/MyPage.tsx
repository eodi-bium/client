import { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { RECYCLING_CONFIG } from '../constants/categories';
import type { RecyclingCode } from '../constants/categories';
import { useAuth } from '../context/AuthContext';
import { useAxios } from '../hooks/useAxios';

// ----------------------------------------------------------------------
// 1. API 응답 타입 정의
// ----------------------------------------------------------------------

interface RecyclingRecord {
  recyclingType: string;
  count: number;
  point: number;
}

interface EventRecord {
  name: string;
  giftCount: number;
  startDate: string; // Java LocalDateTime String (e.g., "2025-12-01T10:00:00")
  endDate: string;
  announceDate: string;
  myPoint: number;
}

interface MemberInfoResponse {
  nickname: string;
  records: RecyclingRecord[];
  eventRecords: EventRecord[];
}

// ----------------------------------------------------------------------
// 2. 헬퍼 함수들
// ----------------------------------------------------------------------

const getTypeIcon = (type: string) =>
  RECYCLING_CONFIG[type as RecyclingCode]?.icon ?? 'fas fa-trash-alt';

const getEventBadgeStyle = (eventName: string) => {
  return 'bg-gray-50 text-gray-700';
};

// 날짜 포맷팅 함수 (2025년 12월 01일 00시 00분)
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);

  // 유효하지 않은 날짜 처리
  if (isNaN(date.getTime())) return dateString;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분`;
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
  // logout 함수를 AuthContext에서 가져온다고 가정
  const { accessToken, isLoggedIn, isLoading: isAuthLoading, logout } = useAuth();
  const axios = useAxios();

  const [memberInfo, setMemberInfo] = useState<MemberInfoResponse | null>(null);
  const [memberId, setMemberId] = useState<string>('');
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isLoggedIn || !accessToken) return;

    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        const id = getMemberIdFromToken(accessToken);
        setMemberId(id);

        const response = await axios.get('/memberInfo');

        if (response.data && response.data.body) {
          setMemberInfo(response.data.body);
        } else {
          setMemberInfo(response.data);
        }
      } catch (error: any) {
        console.error('회원 정보 요청 실패:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData();
  }, [accessToken, isLoggedIn, isAuthLoading, axios]);

  const totalRecyclingPoints = useMemo(() => {
    if (!memberInfo || !memberInfo.records) return 0;
    return memberInfo.records.reduce((acc, record) => acc + record.point, 0);
  }, [memberInfo]);

  const handleLoginClick = () => {
    const apiUrl = import.meta.env.VITE_BASE_URL;
    window.location.href = `${apiUrl}/oauth2/authorization/kakao`;
  };

  // 로그아웃 핸들러 추가
  const handleLogout = async () => {
    if (!window.confirm('정말 로그아웃 하시겠습니까?')) return;

    try {
      await axios.post('/member/logout'); // 1. 서버 로그아웃 요청
    } catch (error) {
      console.error('로그아웃 요청 실패:', error);
      // 서버 요청 실패하더라도 클라이언트 로그아웃은 진행
    } finally {
      logout(); // 2. 클라이언트 상태 초기화 (AuthContext)
      window.location.href = '/'; // 3. 메인으로 리다이렉트
    }
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-xl font-semibold text-gray-600">
          {isAuthLoading ? '로그인 확인 중...' : '정보를 불러오는 중...'}
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-login-circle-line text-3xl text-orange-500"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">
            마이페이지를 이용하시려면 <br /> 로그인을 진행해주세요.
          </p>
          <button
            onClick={handleLoginClick}
            className="w-full py-3 px-4 bg-[#FEE500] hover:bg-[#FDD835] text-[#3c1e1e] font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <i className="ri-kakao-talk-fill text-xl"></i>
            카카오로 로그인하기
          </button>
        </div>
      </div>
    );
  }

  const hasEventHistory = memberInfo?.eventRecords && memberInfo.eventRecords.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <section className="text-center mb-8 relative">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">마이페이지</h1>
          <div className="w-24 h-1 bg-green-500 mx-auto rounded-full" />
        </section>

        <section className="bg-white rounded-2xl shadow-lg p-8 mb-3 border border-gray-100">
          <div className="flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mr-6">
              <i className="fas fa-user text-white text-2xl" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">내 닉네임</h2>
              <p className="text-xl text-gray-600 font-medium">
                {memberInfo?.nickname || '닉네임 없음'}
              </p>
            </div>

            <div className="ml-8 p-2 bg-white rounded-xl shadow-sm border border-gray-100">
              {memberId && (
                <QRCodeCanvas
                  value={`${window.location.origin}/process-qr?user_id=${memberId}`}
                  size={80}
                />
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end mb-8 px-1">
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-500 hover:bg-white/50 px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-sm font-medium"
          >
            <i className="fas fa-sign-out-alt"></i>
            로그아웃
          </button>
        </div>

        {/* 2. 중단: 포인트 및 분리수거 현황 */}
        <section className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4">
                <i className="fas fa-coins text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-3">총 획득 포인트</h3>
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600 mb-2">
                {totalRecyclingPoints.toLocaleString()}
              </div>
              <p className="text-gray-500 text-lg">포인트</p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">
                분리수거 기록 현황
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {memberInfo?.records && memberInfo.records.length > 0 ? (
                  memberInfo.records.map((record, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <i
                            className={`${getTypeIcon(record.recyclingType)} text-green-600 mr-2`}
                          />
                        <span className="text-sm font-medium text-gray-700">
                          {RECYCLING_CONFIG[record.recyclingType as RecyclingCode]?.label ||
                            record.recyclingType}
                        </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-800">{record.count}개</div>
                        <div className="text-xs text-green-600">+{record.point}p</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-gray-500 py-4">
                    아직 분리수거 기록이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. 하단: 이벤트 참여 기록 */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 px-8 py-6">
            <h3 className="text-2xl font-semibold text-white flex items-center">
              <i className="fas fa-history mr-3" />
              이벤트 참여 내역
            </h3>
          </div>

          <div className="p-8">
            {!hasEventHistory ? (
              <div className="text-center py-12">
                <i className="fas fa-inbox text-gray-300 text-6xl mb-4" />
                <p className="text-gray-500 text-lg">참여한 이벤트가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {memberInfo!.eventRecords.map((event, index) => (
                  <article
                    key={`${event.name}-${index}`}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    {/* 카드 헤더: 상세 보기 버튼 삭제됨 */}
                    <header
                      className={`px-6 py-4 ${getEventBadgeStyle(
                        event.name
                      )} border-b border-gray-200`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <i className="fas fa-gift mr-3 text-red-400" />
                          <h4 className="text-lg font-semibold">{event.name}</h4>
                        </div>
                        {/* 상세 보기 버튼 삭제 완료 */}
                      </div>
                    </header>

                    <div className="bg-white p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
                            <i className="fas fa-ticket-alt text-white text-lg" />
                          </div>
                          <div>
                            <h5 className="text-lg font-semibold text-gray-800 mb-1">응모 완료</h5>
                            {/* 날짜 포맷 적용 */}
                            <p className="text-sm text-gray-500">
                              기간: {formatDate(event.startDate)} ~ {formatDate(event.endDate)}
                            </p>
                            <p className="text-sm text-gray-400">
                              발표: {formatDate(event.announceDate)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-800 mb-1">
                            상품 수량: {event.giftCount}개
                          </div>
                          <div className="text-blue-600 font-medium">
                            사용 포인트: {event.myPoint} P
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="h-16" />
      </div>
    </div>
  );
};

export default MyPage;
