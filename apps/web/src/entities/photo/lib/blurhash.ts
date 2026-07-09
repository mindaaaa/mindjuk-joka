import { decode, isBlurhashValid } from 'blurhash';

/**
 * blurhash 문자열을 작은 canvas에 그려 data URL로 변환한다.
 */
export function blurhashToDataUrl(
  blurhash: string,
  size = 32,
): string | undefined {
  if (typeof document === 'undefined') return undefined; // SSR 등 document 없는 환경에서는 canvas 사용 불가 → 조용히 스킵
  if (!isBlurhashValid(blurhash).result) return undefined;

  const pixels = decode(blurhash, size, size);

  // 32x32 임시 캔버스 준비 (그리기 도구인 2d context 확보)
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined; // canvas 미지원/차단 환경 방어

  // decode()가 만든 RGBA 픽셀 배열을 캔버스에 그대로 찍어넣는다
  const imageData = ctx.createImageData(size, size);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);

  // 캔버스 내용을 <img src>에 바로 쓸 수 있는 base64 문자열로 변환
  return canvas.toDataURL();
}
