import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { usePhotoRefreshStore } from './store';

import { photoKeys } from '@/entities/photo';
import { track } from '@/shared/lib/analytics';

/** list.refresh 이벤트에 남길 시작 지점. 타입으로 강제해 track() 호출을 누락 못 하게 한다. */
export type RefreshSource = 'button' | 'pull';

interface RefreshPhotos {
  isRefreshing: boolean;
  refresh: (source: RefreshSource) => Promise<void>;
}

/**
 * 목록을 서버 기준으로 다시 맞춘다.
 *
 * - type: 'active'만 리페치해 화면에 붙은 쿼리만 갱신
 * - 삭제된 사진은 사라지고, 낙관적으로 끼워둔 로컬 카드는 서버 썸네일로 교체
 * - 실패 시 에러 처리는 안 함 (목록 쿼리의 throwOnError가 ErrorBoundary로 전달)
 */
export function useRefreshPhotos(): RefreshPhotos {
  const queryClient = useQueryClient();
  const isRefreshing = usePhotoRefreshStore((s) => s.isRefreshing);

  const refresh = useCallback(
    (source: RefreshSource) =>
      // 구독한 isRefreshing이 아니라 스토어의 최신 값으로 잠금을 판단한다.
      usePhotoRefreshStore.getState().run(async () => {
        track('list.refresh', { source });

        await queryClient.refetchQueries({
          queryKey: photoKeys.lists(),
          type: 'active',
        });
      }),
    [queryClient],
  );

  return { isRefreshing, refresh };
}
