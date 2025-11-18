import { useState } from 'react';

interface Item {
  id: string;
  type: string;
  quantity: number;
}

export const AdminPage = () => {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<Item[]>([{ id: '1', type: '', quantity: 1 }]);

  const handleAddItem = () => {
    const newItem: Item = {
      id: Date.now().toString(),
      type: '',
      quantity: 1,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof Item, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 입력값 검증
    if (!userId.trim()) {
      alert('사용자 ID를 입력하세요.');
      return;
    }

    const invalidItems = items.filter((item) => !item.type || item.quantity < 1);
    if (invalidItems.length > 0) {
      alert('모든 품목을 올바르게 선택하고 개수를 입력하세요.');
      return;
    }

    // 포인트 적립 로직
    console.log('포인트 적립:', { userId, items });
    alert('포인트가 성공적으로 적립되었습니다!');

    // 폼 초기화
    setUserId('');
    setItems([{ id: '1', type: '', quantity: 1 }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <i className="ri-admin-line text-white text-xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-slate-800">포인트 관리 시스템</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">포인트 적립</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">사용자 ID</label>
                <input
                  type="text"
                  placeholder="사용자 ID를 입력하세요"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">품목 목록</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors duration-200 cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-add-line"></i>
                    추가
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <select
                          required
                          value={item.type}
                          onChange={(e) => handleItemChange(item.id, 'type', e.target.value)}
                          className="px-3 py-2.5 pr-8 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer text-sm"
                        >
                          <option value="">품목 선택</option>
                          <option value="battery">건전지</option>
                          <option value="fluorescent">형광등</option>
                        </select>
                        <input
                          type="number"
                          placeholder="개수"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)
                          }
                          className="px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
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
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer whitespace-nowrap"
              >
                <i className="ri-check-line mr-2"></i>
                포인트 적립
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
