import { encode } from 'blurhash';

import {
  BLURHASH_TRANSFORM,
  THUMBNAIL_TRANSFORM,
  encodeBlurhash,
  extractImageThumbnail,
  ImagesPort,
} from '../src';

jest.mock('blurhash', () => ({
  encode: jest.fn().mockReturnValue('LMOCKBLURHASH'),
}));

describe('encodeBlurhash', () => {
  afterEach(() => jest.clearAllMocks());

  it('blurhash.encode를 컴포넌트(4, 3)로 호출한다', () => {
    // given
    const rgba = new Uint8ClampedArray(32 * 32 * 4);

    // when
    const result = encodeBlurhash(rgba, 32, 32);

    // then
    expect(encode).toHaveBeenCalledWith(rgba, 32, 32, 4, 3);
    expect(result).toBe('LMOCKBLURHASH');
  });
});

describe('extractImageThumbnail', () => {
  const rgbaBuffer = new Uint8Array(32 * 32 * 4).fill(1).buffer;
  const jpegBuffer = new Uint8Array([9, 9, 9]).buffer;

  let images: ImagesPort;

  beforeEach(() => {
    jest.clearAllMocks();
    images = {
      transform: jest.fn((_source: ArrayBuffer, params: { format: string }) =>
        Promise.resolve(params.format === 'rgba' ? rgbaBuffer : jpegBuffer),
      ),
    } as unknown as ImagesPort;
  });

  it('원본당 transform을 정확히 2회(rgba, jpeg) 동일 버퍼로 호출한다', async () => {
    // given
    const original = new Uint8Array([1, 2, 3]).buffer;

    // when
    await extractImageThumbnail(images, original);

    // then
    expect(images.transform).toHaveBeenCalledTimes(2);
    expect((images.transform as jest.Mock).mock.calls[0][0]).toBe(original);
    expect((images.transform as jest.Mock).mock.calls[1][0]).toBe(original);
  });

  it('blurhash를 먼저(rgba) 계산하고 이어서 jpeg 썸네일을 만든다', async () => {
    // given
    const original = new Uint8Array([1, 2, 3]).buffer;

    // when
    const result = await extractImageThumbnail(images, original);

    // then: 변환 순서 — 첫 변환은 blurhash(32x32 rgba), 두 번째는 썸네일(300x300 jpeg)
    const calls = (images.transform as jest.Mock).mock.calls;
    expect(calls[0][1]).toEqual({ ...BLURHASH_TRANSFORM, format: 'rgba' });
    expect(calls[1][1]).toEqual({
      ...THUMBNAIL_TRANSFORM,
      format: 'image/jpeg',
    });

    expect(result.bytes).toBe(jpegBuffer);
    expect(result.blurhash).toBe('LMOCKBLURHASH');
    expect(result.mimeType).toBe('image/jpeg');
    expect(encode).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      32,
      32,
      4,
      3,
    );
  });
});
