import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { blurhashToDataUrl } from '../lib/blurhash';
import type { ImageErrorHandler } from '../model/types';

import { cn } from '@/shared/lib/utils/cn';
import { Button } from '@/shared/ui/button';

interface PhotoProgressiveImageProps {
  /** 원본(최종 표시 픽셀) */
  src?: string | undefined;
  /** 썸네일(중간 프리뷰). 목록을 거쳐 왔다면 이미 캐시됐을 가능성이 높다 */
  previewSrc?: string | undefined;
  /** blurhash(초기 placeholder) */
  blurhash?: string | undefined;
  alt: string;
  /** 원본 로드 실패 시 호출. 새 src(재서명 URL)를 반환하면 그걸로 다시 시도한다 */
  onLoadError?: ImageErrorHandler | undefined;
}

/**
 * 상세 뷰어용 3단계 progressive 이미지: blurhash → 썸네일 → 원본
 *
 * - 세 레이어를 겹쳐 두고, 위 레이어가 로드되면 페이드인 → 종료 후 아래를 언마운트
 * - 포지셔닝된 부모를 꽉 채우는 absolute 레이어로 렌더한다(부모가 크기·배경 담당)
 * - 최종 픽셀은 원본
 *
 * 상세는 크게 띄우므로 최종 표시는 원본이어야 한다.
 */
export function PhotoProgressiveImage({
  src,
  previewSrc,
  blurhash,
  alt,
  onLoadError,
}: PhotoProgressiveImageProps) {
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [blurGone, setBlurGone] = useState(false);
  const [previewGone, setPreviewGone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // 실패 후 받아온 새 presigned URL
  const [retrySrc, setRetrySrc] = useState<string | undefined>(undefined);
  const attempts = useRef(0);

  const activeSrc = retrySrc ?? src;

  // src가 갈리면(다른 사진으로 이동 등) 처음부터 다시 시작한다.
  useEffect(() => {
    setFailed(false);
    setRetrying(false);
    setRetrySrc(undefined);
    attempts.current = 0;
  }, [src]);

  const blurUrl = useMemo(
    () => (blurhash ? blurhashToDataUrl(blurhash) : undefined),
    [blurhash],
  );

  // presigned 만료 등으로 원본 로드가 실패하면 새 URL을 받아 1회 다시 시도한다.
  // 브라우저는 이미지 로드를 재시도해주지 않으므로 직접 걸어야 한다.
  const handleError = async () => {
    attempts.current += 1;
    const attempt = attempts.current;

    setRetrying(true);
    const nextSrc = await onLoadError?.(attempt);
    setRetrying(false);

    if (attempt === 1 && nextSrc && nextSrc !== activeSrc) {
      setRetrySrc(nextSrc);
      return;
    }

    setFailed(true);
  };

  // 수동 재시도 (새 URL을 받아낸 뒤에 실패 상태를 푼다)
  // 먼저 풀면 죽은 src로 이미지가 다시 렌더되고, 그 error가 재시도와 경합한다.
  const handleRetryClick = async () => {
    setRetrying(true);
    const nextSrc = await onLoadError?.(1);
    setRetrying(false);

    if (!nextSrc || nextSrc === activeSrc) return;

    attempts.current = 0;
    setRetrySrc(nextSrc);
    setFailed(false);
  };

  return (
    <>
      {/* 1단계: blurhash (object-contain 여백(레터박스)까지 blur로 채운다) */}
      {blurUrl && !blurGone && (
        <img
          src={blurUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-105 object-cover blur-xl"
        />
      )}

      {/* 2단계: 썸네일 (원본 도착 전까지의 빠른 저해상 프리뷰) */}
      {previewSrc && !previewGone && (
        <img
          src={previewSrc}
          alt=""
          aria-hidden
          decoding="async"
          data-clarity-mask="True"
          onLoad={() => setPreviewLoaded(true)}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'opacity' && previewLoaded)
              setBlurGone(true);
          }}
          className={cn(
            'absolute inset-0 h-full w-full object-contain transition-opacity duration-300',
            previewLoaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      {/* 3단계: 원본 (로드되면 위로 페이드인하며 아래를 정리) */}
      {activeSrc && !failed && (
        // key: 재시도 시 새 엘리먼트로 교체해 이전 로드 상태가 남지 않게 한다
        <img
          key={activeSrc}
          src={activeSrc}
          alt={alt}
          decoding="async"
          data-clarity-mask="True"
          onLoad={() => setFullLoaded(true)}
          onError={handleError}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'opacity' && fullLoaded) {
              setBlurGone(true);
              setPreviewGone(true);
            }
          }}
          className={cn(
            'absolute inset-0 h-full w-full object-contain transition-opacity duration-300',
            fullLoaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      {/* 원본을 끝내 못 받으면 blurhash·썸네일 위에 실패를 드러내고 다시 시도할 길을 준다 */}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
          <p className="text-[14px] text-white">사진을 불러오지 못했어요</p>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={handleRetryClick}
            disabled={retrying}
          >
            <RefreshCw className={cn('size-4', retrying && 'animate-spin')} />
            {retrying ? '불러오는 중…' : '다시 불러오기'}
          </Button>
        </div>
      )}
    </>
  );
}
