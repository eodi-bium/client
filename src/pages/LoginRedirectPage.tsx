import { useLoginRedirect } from '../hooks/useLoginRedirect';

export const LoginRedirectPage = () => {
  const { isLoading } = useLoginRedirect();

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">로그인 처리 중...</div>
      </div>
    );
  }

  return null;
};
