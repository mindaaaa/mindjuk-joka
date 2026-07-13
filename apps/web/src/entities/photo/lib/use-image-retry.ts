import { useEffect, useRef, useState } from 'react';

import type { ImageErrorHandler } from '../model/types';

interface ImageRetry {
  /** 실제로 그릴 URL(재시도로 받은 새 URL이 있으면 그것) */
  activeSrc: string | undefined;
  /** 재시도까지 실패해 더 볼 게 없는 상태 */
  failed: boolean;
  /** 새 URL을 받아오는 중 */
  retrying: boolean;
  /** <img>의 onError에 그대로 연결한다 */
  handleError: () => Promise<void>;
  /** 수동 재시도(버튼 등). 새 URL을 받아내면 실패 상태를 푼다 */
  retry: () => Promise<void>;
}

/**
 * 이미지 로드 실패를 감지해 새 URL로 1회 다시 시도하는 상태 머신.
 *
 * - presigned URL은 180초 만에 만료되는데, 브라우저는 이미지 로드를 스스로 재시도하지 않는다.
 * - 이 실패를 잡아 호출자에게 새 URL을 요청하고(onLoadError), 받으면 그걸로 다시 그린다.
 * - 목록(PhotoThumbnail)과 상세(PhotoProgressiveImage)가 이 규칙을 공유한다.
 *
 * @param src - 서버가 준 원래 URL.
 * @param onLoadError - 실패 시 호출. attempt 1에서 새 URL을 반환하면 그걸로 재시도한다.
 */
export function useImageRetry(
  src: string | undefined,
  onLoadError: ImageErrorHandler | undefined,
): ImageRetry {
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // 실패 후 받아온 새 presigned URL
  const [retrySrc, setRetrySrc] = useState<string | undefined>(undefined);
  const attempts = useRef(0);

  const activeSrc = retrySrc ?? src;

  // src가 갈리면(다른 사진으로 이동, 목록 리페치로 서명 재발급 등) 처음부터 다시 시작한다.
  useEffect(() => {
    setFailed(false);
    setRetrying(false);
    setRetrySrc(undefined);
    attempts.current = 0;
  }, [src]);

  const handleError = async () => {
    attempts.current += 1;
    const attempt = attempts.current;

    setRetrying(true);
    const nextSrc = await onLoadError?.(attempt);
    setRetrying(false);

    // 자동 재시도는 1회 (새 URL을 못 받으면 실패로 굳힘)
    if (attempt === 1 && nextSrc && nextSrc !== activeSrc) {
      setRetrySrc(nextSrc);
      return;
    }

    setFailed(true);
  };

  // 새 URL을 받아낸 뒤에 실패 상태를 푼다.
  // 먼저 풀면 죽은 src로 이미지가 다시 렌더되고, 그 error가 이 재시도와 경합한다.
  const retry = async () => {
    setRetrying(true);
    const nextSrc = await onLoadError?.(1);
    setRetrying(false);

    if (!nextSrc || nextSrc === activeSrc) return;

    attempts.current = 0;
    setRetrySrc(nextSrc);
    setFailed(false);
  };

  return { activeSrc, failed, retrying, handleError, retry };
}
