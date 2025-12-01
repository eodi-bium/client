import { type FormEvent, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAxios } from '../hooks/useAxios';
import { useAuth } from '../context/AuthContext';
import { adminItemOptions } from '../data/admin';

interface Item {
  id: string;
  type: string;
  quantity: number | string;
}

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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <i className="ri-admin-line text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">관리자 페이지</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
          >
            <i className="ri-logout-box-r-line"></i>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
};

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
  <div className="rounded-2xl bg-white p-6 shadow-xl">
    <div className="flex items-center gap-2 mb-6">
      <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
        <i className="ri-hand-coin-line text-xl"></i>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">포인트 지급</h3>
    </div>

    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">사용자 아이디</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <i className="ri-user-line"></i>
          </span>
          <input
            type="text"
            placeholder="사용자 아이디 입력"
            required
            value={userId}
            onChange={(e) => onUserIdChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-10 py-3 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-slate-700">버린 쓰레기</label>
          <button
            type="button"
            onClick={onAddItem}
            className="flex items-center gap-1 rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-teal-600"
          >
            <i className="ri-add-line"></i>
            항목 추가
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <select
                  required
                  value={item.type}
                  onChange={(e) => onItemChange(item.id, 'type', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">쓰레기 종류 선택</option>
                  {adminItemOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  name="count"
                  value={item.quantity}
                  placeholder="0"
                  onChange={(e) => onItemChange(item.id, 'quantity', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition hover:bg-rose-100"
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
        className="group w-full rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <i className="ri-check-line text-lg"></i>
          포인트 지급하기
        </span>
      </button>
    </form>
  </div>
);

interface EventFormData {
  giftName: string;
  count: string;
  giftImageUrl: string;
  startDate: string;
  endDate: string;
  announcementDate: string;
}

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

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
          <i className="ri-calendar-event-line text-xl"></i>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">행사 등록</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-semibold text-slate-700">행사 상품명</label>
            <input
              type="text"
              name="giftName"
              value={formData.giftName}
              onChange={handleChange}
              required
              placeholder="상품명을 입력하세요"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="w-32 space-y-2">
            <label className="block text-sm font-semibold text-slate-700">상품 개수</label>
            <input
              type="number"
              name="count"
              value={formData.count}
              onChange={handleChange}
              required
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">이미지 URL</label>
          <input
            type="url"
            name="giftImageUrl"
            value={formData.giftImageUrl}
            onChange={handleChange}
            required
            placeholder="https://example.com/image.jpg"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">시작일</label>
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">종료일</label>
            <input
              type="datetime-local"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">발표일</label>
            <input
              type="datetime-local"
              name="announcementDate"
              value={formData.announcementDate}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <i className="ri-add-circle-line text-lg"></i>
            행사 등록하기
          </span>
        </button>
      </form>
    </div>
  );
};

export const AdminPage = () => {
  const axios = useAxios();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'events' ? 'events' : 'points';

  const [userId, setUserId] = useState(searchParams.get('user_id') || '');
  const [items, setItems] = useState<Item[]>([{ id: '1', type: '', quantity: '' }]);

  const handleTabChange = (tab: 'points' | 'events') => {
    setSearchParams({ tab });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { id: Date.now().toString(), type: '', quantity: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const handleItemChange = (id: string, field: keyof Item, value: string | number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
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
      eventId: 105, // 요청하신 고정값
      memberId: userId,
    };

    try {
      await axios.post('/admin/point/add', payload);

      console.log('Points credited:', payload);
      alert('포인트 적립 완료!');
      resetForm();
    } catch {
      alert('포인트 적립 실패!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex space-x-2 bg-white p-1 rounded-xl shadow-sm w-fit">
          <button
            onClick={() => handleTabChange('points')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'points'
                ? 'bg-teal-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <i className="ri-hand-coin-line"></i>
              포인트 지급
            </span>
          </button>
          <button
            onClick={() => handleTabChange('events')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'events'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <i className="ri-calendar-event-line"></i>
              행사 등록
            </span>
          </button>
        </div>

        {activeTab === 'points' ? (
          <CreditPointsForm
            userId={userId}
            items={items}
            onUserIdChange={setUserId}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onItemChange={handleItemChange}
            onSubmit={handleSubmit}
          />
        ) : (
          <AddEventForm />
        )}
      </main>
    </div>
  );
};
