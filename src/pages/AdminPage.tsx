import { type FormEvent, useState, useEffect } from 'react';
import { useSearchParams, useNavigate, resolvePath } from 'react-router-dom';
import { useAxios } from '../hooks/useAxios';
import { useAuth } from '../context/AuthContext';
import { adminItemOptions } from '../data/admin';

// ----------------------------------------------------------------------
// 1. 타입 정의
// ----------------------------------------------------------------------
interface Item {
  id: string;
  type: string;
  quantity: number | string;
}

interface EventFormData {
  giftName: string;
  count: string;
  giftImageUrl: string;
  startDate: string;
  endDate: string;
  announcementDate: string;
}

interface EventPeriod {
  startDate: string;
  endDate: string;
  announcementDate: string;
}

interface EventStats {
  totalAccumulatedPoints: number;
  totalParticipants: number;
}

interface SingleEvent {
  eventId: number;
  giftName: string;
  count: number;
  giftImageUrl: string;
  period: EventPeriod;
  stats: EventStats;
  winner?: string | null;
}

interface EventListResponse {
  events: SingleEvent[];
}
// ----------------------------------------------------------------------
// 2. 공통 헤더 컴포넌트
// ----------------------------------------------------------------------
const AdminHeader = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const axios = useAxios();

  const handleLogout = async () => {
    try {
      await axios.post('/member/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      logout();
      navigate('/');
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-5">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-green-200 shadow-md">
              <i className="ri-admin-line text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">관리자 페이지</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-500"
          >
            <i className="ri-logout-box-r-line"></i>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
};

// ----------------------------------------------------------------------
// 3. 포인트 지급 폼 컴포넌트
// ----------------------------------------------------------------------
type CreditPointsFormProps = {
  userId: string;
  items: Item[];
  onUserIdChange: (value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onItemChange: (id: string, field: keyof Item, value: string | number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const CreditPointsForm = ({
  userId,
  items,
  onUserIdChange,
  onAddItem,
  onRemoveItem,
  onItemChange,
  onSubmit,
}: CreditPointsFormProps) => (
  <div className="rounded-[24px] bg-white p-8 shadow-sm border border-gray-100">
    <div className="flex items-center gap-3 mb-8">
      <div className="p-3 bg-green-50 rounded-2xl text-green-600">
        <i className="ri-hand-coin-line text-2xl"></i>
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-900">포인트 지급</h3>
        <p className="text-sm text-gray-500">회원에게 분리수거 포인트를 지급합니다.</p>
      </div>
    </div>

    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700 px-1">사용자 아이디</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <i className="ri-user-line text-lg"></i>
          </span>
          <input
            type="text"
            placeholder="사용자 아이디 입력"
            required
            value={userId}
            onChange={(e) => onUserIdChange(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 pl-11 pr-4 py-4 text-gray-800 shadow-sm focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-50 transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="block text-sm font-bold text-gray-700">지급 항목</label>
          <button
            type="button"
            onClick={onAddItem}
            className="flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-bold text-green-600 transition hover:bg-green-100"
          >
            <i className="ri-add-line"></i>
            항목 추가
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition-colors hover:border-green-200"
            >
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <select
                  required
                  value={item.type}
                  onChange={(e) => onItemChange(item.id, 'type', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100 bg-white"
                >
                  <option value="">쓰레기 종류 선택</option>
                  {adminItemOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <input
                    type="number"
                    name="count"
                    value={item.quantity}
                    placeholder="0"
                    onChange={(e) => onItemChange(item.id, 'quantity', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
                    개
                  </span>
                </div>
              </div>

              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                >
                  <i className="ri-delete-bin-line"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="group w-full rounded-2xl bg-green-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-green-200 transition-all hover:bg-green-700 active:scale-[0.98]"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <i className="ri-check-line text-xl"></i>
          포인트 지급하기
        </span>
      </button>
    </form>
  </div>
);

// ----------------------------------------------------------------------
// 4. 행사 등록 폼 컴포넌트
// ----------------------------------------------------------------------
const getFormattedDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const getDefaultEventDates = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const announcement = new Date(tomorrow);
  announcement.setMinutes(announcement.getMinutes() + 30);
  return {
    startDate: getFormattedDate(now),
    endDate: getFormattedDate(tomorrow),
    announcementDate: getFormattedDate(announcement),
  };
};

const AddEventForm = () => {
  const axios = useAxios();
  const [formData, setFormData] = useState<EventFormData>(() => ({
    giftName: '',
    count: '',
    giftImageUrl: '',
    ...getDefaultEventDates(),
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        giftName: formData.giftName,
        count: Number(formData.count),
        giftImageUrl: formData.giftImageUrl,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        announcementDate: new Date(formData.announcementDate).toISOString(),
      };
      await axios.post('/admin/event/add', payload);
      alert('행사가 성공적으로 등록되었습니다!');
      setFormData({
        giftName: '',
        count: '',
        giftImageUrl: '',
        ...getDefaultEventDates(),
      });
    } catch (error) {
      console.error('Failed to add event:', error);
      alert('행사 등록에 실패했습니다.');
    }
  };

  // 공통 Input 스타일
  const inputClassName =
    'w-full rounded-2xl border border-gray-200 px-4 py-3.5 text-sm text-gray-800 shadow-sm focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-50 transition-all placeholder:text-gray-400';
  const labelClassName = 'block text-sm font-bold text-gray-700 mb-2 px-1';

  return (
    <div className="rounded-[24px] bg-white p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-green-50 rounded-2xl text-green-600">
          <i className="ri-calendar-event-line text-2xl"></i>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">행사 등록</h3>
          <p className="text-sm text-gray-500">새로운 이벤트를 생성합니다.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className={labelClassName}>행사 상품명</label>
            <input
              type="text"
              name="giftName"
              value={formData.giftName}
              onChange={handleChange}
              required
              placeholder="상품명을 입력하세요"
              className={inputClassName}
            />
          </div>
          <div className="w-32">
            <label className={labelClassName}>상품 개수</label>
            <input
              type="number"
              name="count"
              value={formData.count}
              onChange={handleChange}
              required
              placeholder="0"
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label className={labelClassName}>이미지 URL</label>
          <input
            type="url"
            name="giftImageUrl"
            value={formData.giftImageUrl}
            onChange={handleChange}
            required
            placeholder="https://example.com/image.jpg"
            className={inputClassName}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClassName}>시작일</label>
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>종료일</label>
            <input
              type="datetime-local"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>발표일</label>
            <input
              type="datetime-local"
              name="announcementDate"
              value={formData.announcementDate}
              onChange={handleChange}
              required
              className={inputClassName}
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-green-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-green-200 transition-all hover:bg-green-700 active:scale-[0.98]"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <i className="ri-add-circle-line text-xl"></i>
            행사 등록하기
          </span>
        </button>
      </form>
    </div>
  );
};

// ----------------------------------------------------------------------
// 5. [UPDATED] 당첨자 추첨 폼 컴포넌트
// ----------------------------------------------------------------------
const DrawWinnerForm = () => {
  const axios = useAxios();
  // State 타입을 SingleEvent[]로 변경
  const [events, setEvents] = useState<SingleEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [drawingId, setDrawingId] = useState<number | null>(null);

  // 행사 목록 불러오기 로직 수정
  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/event/all');

      // [변경 포인트]
      // Java의 record EventResponse(List<SingleEventResponse> events) 구조에 맞춤
      // response.data (또는 body) 자체가 { events: [...] } 형태임
      const responseData = response.data.body || response.data;

      // data 내부의 .events 리스트를 가져와야 함. 없으면 빈 배열
      const eventList = responseData.events || [];

      // 최신순 정렬 (ID 내림차순)
      const sortedList = Array.isArray(eventList)
        ? eventList.sort((a: SingleEvent, b: SingleEvent) => b.eventId - a.eventId)
        : [];

      setEvents(sortedList);
    } catch (error: any) {
      console.error('Failed to fetch events:', error);
      alert('행사 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [axios]);

  // 개별 행사 추첨 핸들러 (타입 수정: EventResponse -> SingleEvent)
  const handleDraw = async (targetEvent: SingleEvent) => {
    if (!window.confirm(`[${targetEvent.giftName}] 행사의 추첨을 진행하시겠습니까?`)) {
      return;
    }

    setDrawingId(targetEvent.eventId);
    try {
      const response = await axios.post('/admin/draw/start', {
        eventId: targetEvent.eventId,
      });

      const resultData = response.data.body || response.data;
      const winnerString = resultData.winnerIds || resultData.winnerId || '';

      alert('추첨이 성공적으로 완료되었습니다!');

      // 로컬 상태 업데이트
      setEvents((prevEvents) =>
        prevEvents.map((evt) =>
          evt.eventId === targetEvent.eventId ? { ...evt, winner: winnerString } : evt
        )
      );
    } catch (error: any) {
      console.error('Draw failed:', error);
      alert('추첨에 실패했습니다. (참여자가 없거나 이미 추첨됨)');
    } finally {
      setDrawingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-[24px] bg-white p-8 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-50 rounded-2xl text-green-600">
            <i className="ri-trophy-line text-2xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">행사 관리 및 추첨</h3>
            <p className="text-sm text-gray-500">등록된 모든 행사의 당첨자를 관리합니다.</p>
          </div>
        </div>
        <button
          onClick={fetchEvents}
          className="p-2 text-gray-400 hover:text-green-600 transition rounded-full hover:bg-green-50"
          title="새로고침"
        >
          <i className="ri-refresh-line text-xl"></i>
        </button>
      </div>

      {isLoading && events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          행사 목록을 불러오는 중입니다...
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50 rounded-[24px] border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 text-gray-300 shadow-sm">
            <i className="ri-calendar-close-line text-3xl"></i>
          </div>
          <h4 className="text-lg font-bold text-gray-600 mb-1">등록된 행사가 없습니다</h4>
          <p className="text-sm">새로운 행사를 등록해주세요.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {events.map((event) => {
            const hasWinner = !!event.winner;
            const winnerList = hasWinner ? event.winner!.split(',') : [];

            return (
              <div
                key={event.eventId}
                className={`bg-white border rounded-[20px] p-6 shadow-sm transition-all hover:shadow-md ${
                  hasWinner ? 'border-green-200 bg-green-50/10' : 'border-gray-100'
                }`}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* 왼쪽: 이미지 */}
                  {event.giftImageUrl && (
                    <div className="w-full md:w-48 h-48 flex-shrink-0 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative">
                      <img
                        src={event.giftImageUrl}
                        alt={event.giftName}
                        className="w-full h-full object-cover"
                      />
                      {hasWinner && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            <i className="ri-check-line mr-1"></i>추첨 완료
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 오른쪽: 정보 및 액션 */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="inline-block bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-lg mb-2">
                            ID: {event.eventId}
                          </span>
                          <h4 className="text-xl font-bold text-gray-800">{event.giftName}</h4>
                        </div>
                        <div className="text-right">
                          <span className="block text-xs text-gray-400 font-medium mb-0.5">
                            상품 수량
                          </span>
                          <span className="text-lg font-bold text-green-600">{event.count}개</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-400 font-medium mb-1">참여자</p>
                          <p className="font-bold text-gray-700 text-sm">
                            {event.stats.totalParticipants.toLocaleString()} 명
                          </p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-400 font-medium mb-1">발표일</p>
                          <p className="font-bold text-gray-700 text-sm">
                            {formatDate(event.period.announcementDate).split('오전')[0]}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 하단: 결과 표시 or 추첨 버튼 */}
                    <div className="pt-4 border-t border-gray-100 mt-2">
                      {hasWinner ? (
                        <div></div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">
                            아직 당첨자가 추첨되지 않았습니다.
                          </p>
                          <button
                            onClick={() => handleDraw(event)}
                            disabled={drawingId === event.eventId}
                            className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 flex items-center gap-2
                              ${
                                drawingId === event.eventId
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                              }`}
                          >
                            {drawingId === event.eventId ? (
                              <>
                                <i className="ri-loader-4-line animate-spin"></i> 처리 중
                              </>
                            ) : (
                              <>
                                <i className="ri-magic-line"></i> 추첨하기
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 6. 메인 관리자 페이지
// ----------------------------------------------------------------------
export const AdminPage = () => {
  const axios = useAxios();
  const [searchParams, setSearchParams] = useSearchParams();

  // 탭 상태 관리 로직
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'events' ? 'events' : tabParam === 'draw' ? 'draw' : 'points';

  const [userId, setUserId] = useState(searchParams.get('user_id') || '');
  const [items, setItems] = useState<Item[]>([{ id: '1', type: '', quantity: '' }]);

  const handleTabChange = (tab: 'points' | 'events' | 'draw') => {
    setSearchParams({ tab });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { id: Date.now().toString(), type: '', quantity: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const handleItemChange = (id: string, field: keyof Item, value: string | number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const resetForm = () => {
    setUserId('');
    setItems([{ id: '1', type: '', quantity: '' }]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId.trim()) {
      alert('유효한 사용자 아이디를 입력해주세요.');
      return;
    }
    const invalidItems = items.filter((item) => !item.type || Number(item.quantity) < 1);
    if (invalidItems.length > 0) {
      alert('제출하기 전에 모든 항목에 대해 종류와 수량을 선택해주세요.');
      return;
    }
    const payload = {
      typeAndCounts: items.map((item) => ({
        recyclingType: item.type,
        count: Number(item.quantity),
      })),
      eventId: 105,
      memberId: userId,
    };

    try {
      await axios.post('/admin/point/add', payload);
      alert('포인트 적립 완료!');
      resetForm();
    } catch {
      alert('포인트 적립 실패!');
    }
  };

  // 탭 버튼 공통 스타일
  const getTabButtonClass = (isActive: boolean) =>
    `px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
      isActive
        ? 'bg-green-600 text-white shadow-md shadow-green-200'
        : 'text-gray-500 hover:bg-white hover:text-green-600'
    }`;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans">
      <AdminHeader />
      <main className="max-w-5xl mx-auto px-5 py-10 space-y-8">
        {/* 탭 네비게이션 */}
        <div className="flex space-x-2 bg-gray-100/50 p-1.5 rounded-2xl w-fit overflow-x-auto border border-gray-200/50">
          <button
            onClick={() => handleTabChange('points')}
            className={getTabButtonClass(activeTab === 'points')}
          >
            <i className="ri-hand-coin-line text-lg"></i>
            포인트 지급
          </button>
          <button
            onClick={() => handleTabChange('events')}
            className={getTabButtonClass(activeTab === 'events')}
          >
            <i className="ri-calendar-event-line text-lg"></i>
            행사 등록
          </button>
          <button
            onClick={() => handleTabChange('draw')}
            className={getTabButtonClass(activeTab === 'draw')}
          >
            <i className="ri-trophy-line text-lg"></i>
            당첨자 추첨
          </button>
        </div>

        {/* 탭 컨텐츠 렌더링 */}
        <div className="animate-fade-in-up">
          {activeTab === 'points' && (
            <CreditPointsForm
              userId={userId}
              items={items}
              onUserIdChange={setUserId}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onItemChange={handleItemChange}
              onSubmit={handleSubmit}
            />
          )}
          {activeTab === 'events' && <AddEventForm />}
          {activeTab === 'draw' && <DrawWinnerForm />}
        </div>
      </main>
    </div>
  );
};
