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
  let transformer: {
    transform: jest.Mock;
    output: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    transformer = {
      transform: jest.fn().mockReturnThis(),
      output: jest.fn((opts: { format: string }) => ({
        response: () => ({
          arrayBuffer: jest
            .fn()
            .mockResolvedValue(
              opts.format === 'rgba' ? rgbaBuffer : jpegBuffer,
            ),
        }),
      })),
    };
    images = {
      input: jest.fn().mockReturnValue(transformer),
    } as unknown as ImagesPort;
  });

  it('원본당 input을 정확히 2회(rgba, jpeg) 동일 버퍼로 호출한다', async () => {
    // given
    const original = new Uint8Array([1, 2, 3]).buffer;

    // when
    await extractImageThumbnail(images, original);

    // then
    expect(images.input).toHaveBeenCalledTimes(2);
    expect((images.input as jest.Mock).mock.calls[0][0]).toBe(original);
    expect((images.input as jest.Mock).mock.calls[1][0]).toBe(original);
  });

  it('blurhash를 먼저(rgba) 계산하고 이어서 jpeg 썸네일을 만든다', async () => {
    // given
    const original = new Uint8Array([1, 2, 3]).buffer;

    // when
    const result = await extractImageThumbnail(images, original);

    // then: 변환 순서 — 첫 변환은 blurhash(32x32), 두 번째는 썸네일(300x300)
    expect(transformer.transform.mock.calls[0][0]).toEqual(BLURHASH_TRANSFORM);
    expect(transformer.transform.mock.calls[1][0]).toEqual(THUMBNAIL_TRANSFORM);
    expect(transformer.output.mock.calls[0][0]).toEqual({ format: 'rgba' });
    expect(transformer.output.mock.calls[1][0]).toEqual({
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
