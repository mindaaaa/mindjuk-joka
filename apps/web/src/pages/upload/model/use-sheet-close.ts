import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useUploadQueueStore } from '@/features/photo-upload';

/**
 * 업로드 시트 닫기(딤 클릭·ESC·완료 버튼 공용).
 * - 업로드 중(pending·uploading)이면 무시 — 중단은 "취소" 버튼으로만.
 * - 닫힐 때 큐를 비우고 /photos로 이동.
 */
export function useSheetClose(): () => void {
  const reset = useUploadQueueStore((s) => s.reset);
  const navigate = useNavigate();

  const close = useCallback(() => {
    const flying = useUploadQueueStore
      .getState()
      .items.some((i) => i.status === 'pending' || i.status === 'uploading');
    if (flying) return;

    reset();
    navigate('/photos');
  }, [reset, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return close;
}
