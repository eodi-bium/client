import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-gray-500 text-center mb-8">
        요청하신 페이지가 존재하지 않거나,<br />
        사용할 수 없는 페이지입니다.
      </p>
      <button
        onClick={() => navigate('/')}
        className="bg-primary-500 text-black px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors border border-gray-200 shadow-sm"
      >
        홈으로 돌아가기
      </button>
    </div>
  );
};

