import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { TOAST_DURATION } from './toast';

/**
 * - toast 배경·글자색은 richColors 팔레트를 덮어쓰므로 지정하지 않는다.
 * - theme은 앱의 수동 토글 값을 주입한다('system'은 OS 설정만 봄).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      richColors
      toastOptions={{
        duration: TOAST_DURATION.info,
        closeButtonAriaLabel: '닫기',
        classNames: {
          toast: 'group toast group-[.toaster]:shadow-lg',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
