import { cn } from '@/shared/lib/utils/cn';
import { Button } from '@/shared/ui/button';

interface ErrorAction {
  label: string;
  onClick: () => void;
  pending?: boolean;
}

interface ErrorStateProps {
  title: string;
  description: string;
  retry?: ErrorAction;
  secondary?: ErrorAction;
  /** screen=전체 화면 / section=영역만 */
  fill?: 'screen' | 'section';
}

export function ErrorState({
  title,
  description,
  retry,
  secondary,
  fill = 'section',
}: ErrorStateProps) {
  return (
    <section
      className={cn(
        'flex flex-col items-center justify-center gap-6 px-6 text-center',
        fill === 'screen' ? 'min-h-screen' : 'min-h-[60vh]',
      )}
    >
      <div className="flex flex-col gap-2">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {(retry || secondary) && (
        <div className="flex flex-col items-center gap-1">
          {retry && (
            <Button
              type="button"
              onClick={retry.onClick}
              disabled={retry.pending}
            >
              {retry.pending ? '다시 시도 중…' : retry.label}
            </Button>
          )}
          {secondary && (
            <Button
              type="button"
              variant="ghost"
              onClick={secondary.onClick}
              className="text-muted-foreground hover:text-foreground"
            >
              {secondary.label}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
