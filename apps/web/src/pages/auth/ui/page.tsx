import { Lock } from 'lucide-react';

import bgDark from '@/assets/bg-dark.webp';
import bgLight from '@/assets/bg-light.webp';
import character from '@/assets/character.webp';
import { LoginForm } from '@/features/auth';
import { toast } from '@/shared/ui/toast';

function InviteButton() {
  const handleClick = () => {
    toast('초대 코드 기능은 아직 준비 중이에요.');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#d8dcf0] bg-[#eef0fa] text-[16px] font-medium tracking-[-0.43px] text-[#5a66a8] transition-colors hover:bg-[#e6e9f7] dark:border-[#363c5e] dark:bg-[#242a44] dark:text-[#aab4e6] dark:hover:bg-[#2b3252]"
    >
      <Lock className="size-[18px] shrink-0" aria-hidden="true" />
      초대 코드로 참여하기
    </button>
  );
}

export function AuthPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-muted">
      {/* 라이트는 슬로우 줌, 다크는 매달린 별 스웨이+밝기 맥동 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <img
          src={bgLight}
          alt=""
          className="animate-joka-bg-zoom size-full object-cover dark:hidden"
        />
        <img
          src={bgDark}
          alt=""
          className="animate-joka-bg-sway hidden size-full object-cover dark:block"
        />
      </div>

      {/* 캐릭터 (라이트=소프트 플로트, 다크=패럴랙스 드리프트) */}
      <div className="relative z-10 flex flex-1 items-end justify-center">
        <img
          src={character}
          alt="침대에서 잠든 아이 일러스트"
          className="animate-joka-character w-full max-w-[420px] select-none object-contain"
          draggable={false}
        />
      </div>

      {/* 바텀시트 (카카오 CTA + 초대 버튼 + 약관) */}
      <section className="relative z-10 rounded-t-3xl border-t border-border bg-card px-5 pb-8 pt-[18px] drop-shadow-[0_-4px_16px_rgba(100,120,200,0.12)]">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
          <span
            className="h-1 w-9 rounded-full bg-[#e3e3e6] dark:bg-white/15"
            aria-hidden="true"
          />

          <LoginForm />

          {/* 또는 구분선 */}
          <div className="flex w-full items-center gap-3">
            <span className="h-px flex-1 bg-[#e8e8ec] dark:bg-border" />
            <span className="text-[13px] text-[#b3b3b8] dark:text-muted-foreground">
              또는
            </span>
            <span className="h-px flex-1 bg-[#e8e8ec] dark:bg-border" />
          </div>

          <InviteButton />

          <p className="text-center text-[13px] tracking-[-0.08px] text-[#b3b3b8] dark:text-muted-foreground">
            계속하면{' '}
            <span className="text-[#9a9aa0] underline underline-offset-2 dark:text-foreground/70">
              개인정보 처리방침
            </span>
            에 동의하게 됩니다
          </p>
        </div>
      </section>
    </main>
  );
}
