import { env } from '@/shared/config/env';
import { Button } from '@/shared/ui/button';

/**
 * 카카오 말풍선 아이콘.
 */
function KakaoIcon() {
  return (
    <svg
      viewBox="0 0 23.9931 23.9931"
      fill="currentColor"
      aria-hidden="true"
      className="!size-5 shrink-0"
    >
      <path d="M11.9965 3.49899C6.79804 3.49899 2.49928 6.79804 2.49928 10.8969C2.49928 13.4961 4.29876 15.7955 6.99799 17.0951C6.79804 17.7949 6.29819 19.4944 6.19822 19.8943C6.19822 20.0942 6.29819 20.1942 6.49813 20.0942C6.99799 19.7943 9.09738 18.2947 9.59724 17.9948C10.397 18.0948 11.1968 18.1948 11.9965 18.1948C17.1951 18.1948 21.4938 14.8957 21.4938 10.7969C21.4938 6.69807 17.1951 3.49899 11.9965 3.49899Z" />
    </svg>
  );
}

/**
 * 카카오 OAuth 시작 버튼.
 */
export function LoginForm() {
  const handleKakaoLogin = () => {
    window.location.href = `${env.VITE_API_BASE_URL}/v1/auth/kakao`;
  };

  return (
    <Button
      size="lg"
      onClick={handleKakaoLogin}
      className="h-[52px] w-full gap-2 rounded-[14px] bg-[#FEE500] text-[15px] font-semibold text-[#191919] shadow-none hover:bg-[#FEE500]/90"
    >
      <KakaoIcon />
      카카오로 시작하기
    </Button>
  );
}
