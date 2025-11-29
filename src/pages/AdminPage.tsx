import { type FormEvent, useState } from 'react';
import { useAxios } from '../hooks/useAxios';
import { adminItemOptions } from '../data/admin';

interface Item {
  id: string;
  type: string;
  quantity: number;
}

const AdminHeader = () => (
  <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <i className="ri-admin-line text-white text-xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">포인트 관리 시스템</h1>
          </div>
        </div>
      </div>
    </div>
  </header>
);

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
    <h3 className="text-lg font-semibold text-slate-900">포인트 부여</h3>

    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">User ID</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <i className="ri-user-line"></i>
          </span>
          <input
            type="text"
            placeholder="Enter user ID"
            required
            value={userId}
            onChange={(e) => onUserIdChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-10 py-3 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-slate-700">Items</label>
          <button
            type="button"
            onClick={onAddItem}
            className="flex items-center gap-1 rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-teal-600"
          >
            <i className="ri-add-line"></i>
            Add item
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
                  <option value="">Select item</option>
                  {adminItemOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Quantity"
                  required
                  min={1}
                  value={item.quantity}
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
          Credit points
        </span>
      </button>
    </form>
  </div>
);

export const AdminPage = () => {
  const axios = useAxios();
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<Item[]>([{ id: '1', type: '', quantity: 1 }]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { id: Date.now().toString(), type: '', quantity: 1 }]);
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
              [field]:
                field === 'quantity'
                  ? typeof value === 'number'
                    ? value
                    : Number(value) || 1
                  : value,
            }
          : item
      )
    );
  };

  const resetForm = () => {
    setUserId('');
    setItems([{ id: '1', type: '', quantity: 1 }]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId.trim()) {
      alert('Please enter a valid user ID.');
      return;
    }

    const invalidItems = items.filter((item) => !item.type || item.quantity < 1);
    if (invalidItems.length > 0) {
      alert('Please choose an item and quantity for every entry before submitting.');
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
      await axios.post('/draw-point/join', payload);

      console.log('Points credited:', payload);
      alert('Points have been credited successfully!');
      resetForm();
    } catch (error) {
      console.error('Failed to credit points:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <CreditPointsForm
          userId={userId}
          items={items}
          onUserIdChange={setUserId}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onItemChange={handleItemChange}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
};
