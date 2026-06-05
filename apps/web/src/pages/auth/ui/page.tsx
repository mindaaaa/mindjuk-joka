import { LoginForm } from '@/features/auth';

export function AuthPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-background">
      {/* 히어로: 로고 마크 + 타이틀 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-[18px] px-6">
        <div className="flex size-[120px] items-center justify-center rounded-[28px] bg-brand shadow-sm">
          <span className="text-[32px] font-bold tracking-wide text-brand-foreground">
            JOKA
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-[40px] font-bold leading-none tracking-wide text-foreground">
            JOKA
          </h1>
          <p className="text-[17px] text-muted-foreground">
            우리 아이의 앨범, 함께 채우기
          </p>
        </div>
      </div>

      {/* 하단 시트: 카카오 CTA + 약관 */}
      <section className="rounded-t-3xl border-t border-border bg-card px-5 pb-7 pt-[18px]">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center">
          <span
            className="mb-[18px] h-1 w-9 rounded-full bg-muted"
            aria-hidden="true"
          />
          <LoginForm />
          {/* TODO: 이용약관 / 개인정보 처리방침 페이지 연결 */}
          <p className="mt-3.5 text-center text-[13px] leading-[1.6] text-muted-foreground">
            계속하면{' '}
            <span className="underline underline-offset-2">이용약관</span> 및{' '}
            <span className="underline underline-offset-2">
              개인정보 처리방침
            </span>
            에<br />
            동의하게 됩니다
          </p>
        </div>
      </section>
    </main>
  );
}
