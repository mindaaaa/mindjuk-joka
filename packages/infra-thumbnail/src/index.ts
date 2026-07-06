import { encode } from 'blurhash';

/**
 * Cloudflare Images 바인딩을 감싸는 좁은 포트.
 *
 * infra-thumbnail이 Workers 타입(@cloudflare/workers-types)에 직접 의존하지
 * 않도록, 실제로 사용하는 호출 체인만 최소한으로 노출한다. 소비자(nail-artist)는
 * `env.IMAGES`를 이 포트로 주입하고, 단위 테스트에서는 이 포트를 mock한다.
 */
export type ImageFit = 'cover' | 'contain' | 'scale-down' | 'crop' | 'pad';

export interface ImageTransform {
  width: number;
  height: number;
  fit: ImageFit;
}

export interface ImageOutputOptions {
  // 인코딩 포맷(e.g. 'image/jpeg') 또는 원시 픽셀('rgba'/'rgb').
  format: string;
}

export interface ImageTransformationResult {
  response(): { arrayBuffer(): Promise<ArrayBuffer> };
}

export interface ImageTransformer {
  transform(transform: ImageTransform): ImageTransformer;
  output(options: ImageOutputOptions): ImageTransformationResult;
}

export interface ImagesPort {
  input(bytes: ArrayBuffer): ImageTransformer;
}

/**
 * 변환 파라미터는 모듈 상수로 고정한다.
 * 가변 파라미터는 Cloudflare Images의 unique-transformation 과금을 늘리므로,
 * 원본당 정확히 2회(blurhash용 rgba + 썸네일용 jpeg)만 호출되도록 한다.
 */
export const THUMBNAIL_TRANSFORM: ImageTransform = {
  width: 300,
  height: 300,
  fit: 'cover',
};
export const BLURHASH_TRANSFORM: ImageTransform = {
  width: 32,
  height: 32,
  fit: 'cover',
};
export const THUMBNAIL_FORMAT = 'image/jpeg';
export const THUMBNAIL_MIME_TYPE = 'image/jpeg';
export const BLURHASH_FORMAT = 'rgba';

// blurhash 컴포넌트 수(x, y). 32x32 축소 이미지에 대한 표준값.
const BLURHASH_COMPONENT_X = 4;
const BLURHASH_COMPONENT_Y = 3;

export function encodeBlurhash(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): string {
  return encode(
    rgba,
    width,
    height,
    BLURHASH_COMPONENT_X,
    BLURHASH_COMPONENT_Y,
  );
}

export interface ExtractedImageThumbnail {
  bytes: ArrayBuffer;
  blurhash: string;
  mimeType: string;
}

/**
 * 원본 이미지 바이트에서 300x300 JPEG 썸네일과 blurhash를 추출한다.
 * S3/R2 접근은 소비자(전략)의 책임이며, 여기서는 Images 변환·blurhash 계산만 한다.
 *
 * 주의:
 * - blurhash를 먼저 계산한다. 실패 시 호출자가 R2에 아무것도 쓰지 않도록.
 * - 동일한 `original` 버퍼를 두 변환에 그대로 재전달한다. ArrayBuffer는 스트림과
 *   달리 소비되지 않으므로 재사용이 안전하다.
 */
export async function extractImageThumbnail(
  images: ImagesPort,
  original: ArrayBuffer,
): Promise<ExtractedImageThumbnail> {
  const rgbaBuffer = await images
    .input(original)
    .transform(BLURHASH_TRANSFORM)
    .output({ format: BLURHASH_FORMAT })
    .response()
    .arrayBuffer();
  const blurhash = encodeBlurhash(
    new Uint8ClampedArray(rgbaBuffer),
    BLURHASH_TRANSFORM.width,
    BLURHASH_TRANSFORM.height,
  );

  const bytes = await images
    .input(original)
    .transform(THUMBNAIL_TRANSFORM)
    .output({ format: THUMBNAIL_FORMAT })
    .response()
    .arrayBuffer();

  return { bytes, blurhash, mimeType: THUMBNAIL_MIME_TYPE };
}
