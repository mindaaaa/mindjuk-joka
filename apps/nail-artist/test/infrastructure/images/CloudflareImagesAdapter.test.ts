import { CloudflareImagesAdapter } from '../../../src/infrastructure/images/CloudflareImagesAdapter';

describe('CloudflareImagesAdapter', () => {
  it('input→transform→output(await)→image 드레인으로 바이트를 반환한다', async () => {
    // given: input().transform().output() 체인을 mock. output은 Promise.
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const outputMock = jest.fn().mockResolvedValue({
      image: () => new Response(bytes).body,
    });
    const transformMock = jest.fn().mockReturnValue({ output: outputMock });
    const inputMock = jest.fn().mockReturnValue({ transform: transformMock });
    const binding = { input: inputMock } as unknown as ImagesBinding;

    const adapter = new CloudflareImagesAdapter(binding);
    const source = new Uint8Array([9, 9]).buffer;

    // when
    const result = await adapter.transform(source, {
      width: 32,
      height: 32,
      fit: 'cover',
      format: 'rgba',
    });

    // then: 원본 버퍼 그대로 전달, transform/output에 정확한 파라미터, 결과 바이트 드레인
    expect(inputMock).toHaveBeenCalledWith(source);
    expect(transformMock).toHaveBeenCalledWith({
      width: 32,
      height: 32,
      fit: 'cover',
    });
    expect(outputMock).toHaveBeenCalledWith({ format: 'rgba' });
    expect(new Uint8Array(result)).toEqual(bytes);
  });
});
