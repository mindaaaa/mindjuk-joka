import { Check, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/shared/lib/utils/cn';

interface AnalyticsConsentProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function AnalyticsConsent({
  checked,
  onCheckedChange,
}: AnalyticsConsentProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => onCheckedChange(!checked);

  // Esc로 팝오버 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="flex w-full items-start justify-center gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label="앱 개선을 위한 화면 분석에 동의"
        onClick={toggle}
        className={cn(
          'mt-px flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
          checked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-[#d1d1d6] bg-transparent dark:border-border',
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </button>

      <label
        onClick={toggle}
        className="text-[13px] leading-[18px] tracking-[-0.08px] text-[#9a9aa0] dark:text-muted-foreground"
      >
        앱 개선을 위한 화면 분석에 동의합니다{' '}
        <span className="whitespace-nowrap">(사진 제외)</span>
      </label>

      {/* 자세히 (i) — 팝오버 트리거 */}
      <div className="relative">
        <button
          type="button"
          aria-label="자세히"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-px flex size-[18px] items-center justify-center rounded-full text-[#b3b3b8] transition-colors hover:text-[#7a7a80] dark:text-muted-foreground dark:hover:text-foreground/70"
        >
          <Info className="size-[15px]" />
        </button>

        {open && (
          <>
            {/* 바깥 클릭 닫기 */}
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              role="tooltip"
              className="absolute bottom-full right-0 z-50 mb-2 w-[240px] rounded-xl border border-border bg-card p-3 text-left text-[12px] leading-[17px] tracking-[-0.05px] text-card-foreground shadow-[0_6px_24px_rgba(60,70,120,0.18)]"
            >
              <p>
                어떤 화면을 보고 어디서 헤매시는지 참고해서 앱을 개선합니다.
              </p>
              <p className="mt-1.5 text-muted-foreground">
                사진(썸네일·상세 이미지)은 자동으로 가려져서 절대 수집되지
                않아요.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
