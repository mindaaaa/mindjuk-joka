import { useCallback, useEffect, useRef } from 'react';

import type { Album } from '@/entities/album';

/**
 * enterAlbum을 지연 실행한다.
 * - 재예약/언마운트 시 이전 타이머를 취소한다.
 */
export function useDelayedEnter(enterAlbum: (album: Album) => void) {
  const timerRef = useRef<number | undefined>(undefined);

  const cancel = useCallback(() => {
    window.clearTimeout(timerRef.current);
  }, []);

  const schedule = useCallback(
    (album: Album, delay: number) => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => enterAlbum(album), delay);
    },
    [enterAlbum],
  );

  useEffect(() => cancel, [cancel]);

  return { schedule, cancel };
}
