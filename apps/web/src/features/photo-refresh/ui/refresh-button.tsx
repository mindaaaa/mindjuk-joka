import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useRefreshPhotos } from '../model/use-refresh-photos';

import { cn } from '@/shared/lib/utils/cn';
import { Button } from '@/shared/ui/button';

const ANNOUNCEMENT = {
  refreshing: '사진 목록을 새로고침하는 중이에요',
  done: '사진 목록을 새로고침했어요',
} as const;

/**
 * 홈 화면 PWA에는 브라우저 새로고침 버튼이 사라지므로 그 자리를 대신하는 새로고침 버튼
 *
 * - 진행 중에는 disabled로 중복 요청을 막음(스토어 잠금과 이중 방어)
 * - 아이콘 회전을 볼 수 없는 스크린리더에는 aria-live로 시작·완료를 알림
 */
export function RefreshButton() {
  const { isRefreshing, refresh } = useRefreshPhotos();
  const announcement = useRefreshAnnouncement(isRefreshing);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="사진 목록 새로고침"
        disabled={isRefreshing}
        onClick={() => void refresh('button')}
      >
        <RefreshCw className={cn(isRefreshing && 'animate-spin')} aria-hidden />
      </Button>

      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}

/** 마운트 직후엔 알릴 것이 없다. 첫 새로고침부터 시작 → 완료 순서로 알린다. */
function useRefreshAnnouncement(isRefreshing: boolean): string {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setAnnouncement((prev) => {
      if (isRefreshing) return ANNOUNCEMENT.refreshing;
      return prev ? ANNOUNCEMENT.done : '';
    });
  }, [isRefreshing]);

  return announcement;
}
