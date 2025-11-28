import { useMemo } from 'react';
import {
  eventBadgeStyleMap,
  myPageData,
  recyclingTypeIconMap,
  type RecyclingHistoryEntry,
} from '../data/myPage';

type RecyclingSummary = Record<
  string,
  {
    count: number;
    points: number;
  }
>;

type GroupedHistory = Record<string, RecyclingHistoryEntry[]>;

const getTypeIcon = (type: string) => recyclingTypeIconMap[type] ?? 'fas fa-trash-alt';

const getEventBadgeStyle = (eventName: string) =>
  eventBadgeStyleMap[eventName] ?? 'bg-gray-100 text-gray-700';

export const MyPage = () => {
  const recyclingSummary = useMemo<RecyclingSummary>(() => {
    return myPageData.history.reduce<RecyclingSummary>((acc, entry) => {
      if (!acc[entry.type]) {
        acc[entry.type] = { count: 0, points: 0 };
      }
      acc[entry.type].count += entry.quantity;
      acc[entry.type].points += entry.points;
      return acc;
    }, {});
  }, []);

  const groupedByEvent = useMemo<GroupedHistory>(() => {
    return myPageData.history.reduce<GroupedHistory>((acc, entry) => {
      if (!acc[entry.event]) {
        acc[entry.event] = [];
      }
      acc[entry.event].push(entry);
      return acc;
    }, {});
  }, []);

  const hasHistory = myPageData.history.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <section className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">마이페이지</h1>
          <div className="w-24 h-1 bg-green-500 mx-auto rounded-full" />
        </section>

        <section className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mr-6">
              <i className="fas fa-user text-white text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">내 ID</h2>
              <p className="text-xl text-gray-600 font-medium">{myPageData.userId}</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4">
                <i className="fas fa-coins text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-3">응모포인트</h3>
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600 mb-2">
                {myPageData.totalPoints.toLocaleString()}
              </div>
              <p className="text-gray-500 text-lg">포인트</p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">
                분리수거 세부 현황
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(recyclingSummary).map(([type, summary]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <i className={`${getTypeIcon(type)} text-green-600 mr-2`} />
                        <span className="text-sm font-medium text-gray-700">{type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">{summary.count}개</div>
                      <div className="text-xs text-green-600">+{summary.points}p</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 px-8 py-6">
            <h3 className="text-2xl font-semibold text-white flex items-center">
              <i className="fas fa-history mr-3" />
              분리수거 내역
            </h3>
          </div>

          <div className="p-8">
            {!hasHistory ? (
              <div className="text-center py-12">
                <i className="fas fa-inbox text-gray-300 text-6xl mb-4" />
                <p className="text-gray-500 text-lg">분리수거 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedByEvent).map(([eventName, entries]) => (
                  <article
                    key={eventName}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <header
                      className={`px-6 py-4 ${getEventBadgeStyle(
                        eventName
                      )} border-b border-gray-200`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <i className="fas fa-gift mr-3" />
                          <h4 className="text-lg font-semibold">{eventName}</h4>
                        </div>
                        <button
                          type="button"
                          className="flex items-center px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors duration-200 text-sm font-medium whitespace-nowrap !rounded-button"
                        >
                          <i className="fas fa-info-circle mr-1" />
                          행사 정보 보기
                        </button>
                      </div>
                    </header>

                    <div className="bg-white">
                      {entries.map((entry, index) => (
                        <div
                          key={entry.id}
                          className={`p-6 transition-colors duration-200 border-b border-gray-100 ${
                            index === entries.length - 1 ? 'last:border-b-0' : ''
                          } hover:bg-gray-50`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mr-4">
                                <i className={`${getTypeIcon(entry.type)} text-white text-lg`} />
                              </div>
                              <div>
                                <h5 className="text-lg font-semibold text-gray-800 mb-1">
                                  {entry.type}
                                </h5>
                                <p className="text-gray-500">{entry.date}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-800 mb-1">
                                {entry.quantity}개
                              </div>
                              <div className="text-green-600 font-medium">
                                +{entry.points} 포인트
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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
