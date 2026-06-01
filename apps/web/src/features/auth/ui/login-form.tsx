import { env } from '@/shared/config/env';
import { Button } from '@/shared/ui/button';

/**
 * 카카오 OAuth 시작 버튼.
 */
export function LoginForm() {
  const handleKakaoLogin = () => {
    window.location.href = `${env.VITE_API_BASE_URL}/v1/auth/kakao`;
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="lg"
        className="w-full bg-[#FEE500] text-[#191600] hover:bg-[#FEE500]/90"
        onClick={handleKakaoLogin}
      >
        카카오로 시작하기
      </Button>
    </div>
  );
}
