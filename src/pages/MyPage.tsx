import { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { recyclingTypeIconMap } from '../data/myPage';
import { useAuth } from '../context/AuthContext';
import { useAxios } from '../hooks/useAxios';

// API 응답 타입 정의
interface RecyclingRecord {
  recyclingType: string;
  count: number;
  point: number;
}

interface MemberInfoResponse {
  nickname: string;
  records: RecyclingRecord[];
}

// 아이콘 가져오기 헬퍼 함수
const getTypeIcon = (type: string) => recyclingTypeIconMap[type] ?? 'fas fa-trash-alt';

// JWT에서 memberId 추출하는 함수
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
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.userId || payload.sub || '';
  } catch (e) {
    console.error('Failed to parse JWT', e);
    return '';
  }
};

export const MyPage = () => {
  // 1. AuthContext 상태 가져오기
  const { accessToken, isLoggedIn, isLoading: isAuthLoading } = useAuth();

  // 2. useAxios 훅 사용 (헤더, baseURL 처리가 된 axios 인스턴스)
  const axios = useAxios();

  const [memberInfo, setMemberInfo] = useState<MemberInfoResponse | null>(null);
  const [memberId, setMemberId] = useState<string>('');
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (isAuthLoading) return;

    // 로그인이 안 되어 있거나 토큰이 없으면 중단
    if (!isLoggedIn || !accessToken) {
      return;
    }

    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        const id = getMemberIdFromToken(accessToken);
        setMemberId(id);

        const response = await axios.get('/memberInfo');

        console.log('MemberInfo Response:', response.data);

        if (response.data && response.data.body) {
          setMemberInfo(response.data.body);
        } else {
          setMemberInfo(response.data);
        }
      } catch (error: any) {
        console.error('회원 정보 요청 실패:', error);
        if (error.response) {
          console.error('Status:', error.response.status);
        }
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData();
  }, [accessToken, isLoggedIn, isAuthLoading, axios]);

  // 총 포인트 계산
  const totalPoints = useMemo(() => {
    if (!memberInfo || !memberInfo.records) return 0;
    return memberInfo.records.reduce((acc, record) => acc + record.point, 0);
  }, [memberInfo]);

  // 로그인 버튼 핸들러
  const handleLoginClick = () => {
    const apiUrl = import.meta.env.VITE_BASE_URL;
    window.location.href = `${apiUrl}/oauth2/authorization/kakao`;
  };

  // 로딩 화면
  if (isAuthLoading || isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-xl font-semibold text-gray-600">
          {isAuthLoading ? '로그인 확인 중...' : '정보를 불러오는 중...'}
        </div>
      </div>
    );
  }

  // 로그인 필요 화면
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-login-circle-line text-3xl text-orange-500"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">
            마이페이지를 이용하시려면
            <br />
            로그인을 진행해주세요.
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

  // 정상 렌더링 화면
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <section className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">마이페이지</h1>
          <div className="w-24 h-1 bg-green-500 mx-auto rounded-full" />
        </section>

        {/* 사용자 정보 및 QR 코드 섹션 */}
        <section className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex items-center justify-center mb-6">
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

        {/* 포인트 및 분리수거 현황 섹션 */}
        <section className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4">
                <i className="fas fa-coins text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-3">총 응모 포인트</h3>
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600 mb-2">
                {totalPoints.toLocaleString()}
              </div>
              <p className="text-gray-500 text-lg">포인트</p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">
                분리수거 세부 현황
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {memberInfo?.records && memberInfo.records.length > 0 ? (
                  memberInfo.records.map((record) => (
                    <div key={record.recyclingType} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <i
                            className={`${getTypeIcon(record.recyclingType)} text-green-600 mr-2`}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {record.recyclingType}
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

        <div className="h-16" />
      </div>
    </div>
  );
};

export default MyPage;
