import { ImageIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

/** 로딩 — 스켈레톤 카드 3개가 순차 딜레이로 펄스 */
export function LoadingState() {
  return (
    <section className="mx-auto w-full max-w-md px-6 pt-6">
      <header className="mb-5">
        <h1 className="text-[22px] font-bold leading-[33px] text-foreground">
          앨범을 불러오는 중
        </h1>
        <p className="mt-1 text-[15px] leading-[22.5px] tracking-[-0.2px] text-muted-foreground">
          잠시만 기다려주세요
        </p>
      </header>
      <div className="flex flex-col gap-3">
        {[0, 0.15, 0.3].map((delay, index) => (
          <Skeleton
            key={index}
            className="h-[84px] rounded-[20px]"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </section>
  );
}

/** 에러 — 재시도 가능 */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <CenteredState
      title="앨범을 불러오지 못했어요"
      description={
        <>
          네트워크 연결을 확인하고
          <br />
          다시 시도해주세요
        </>
      }
      action={
        <Button variant="secondary" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      }
    />
  );
}

/** 빈 상태 — 앨범은 운영자가 수동 생성하므로 사용자용 생성 CTA 없음(초대되면 나타남) */
export function EmptyState() {
  return (
    <CenteredState
      title="아직 함께한 앨범이 없어요"
      description={
        <>
          가족에게 초대를 받으면
          <br />이 자리에 앨범이 나타나요
        </>
      }
    />
  );
}

/** 아이콘 원 + 제목 + 본문(+선택적 액션)을 중앙 정렬하는 빈/에러 공통 레이아웃 */
function CenteredState({
  title,
  description,
  action,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-[22px] px-6 text-center">
      <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[28px] bg-muted">
        <ImageIcon
          className="h-[34px] w-[34px] text-muted-foreground/60"
          strokeWidth={1.75}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[17px] font-semibold text-foreground">{title}</p>
        <p className="text-[15px] leading-[22.5px] text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </section>
  );
}
