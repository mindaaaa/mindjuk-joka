import {
  ImagesPort,
  ImageTransformParams,
} from '@joka/infra-thumbnail/src';

// Cloudflare Images 바인딩을 infra-thumbnail의 ImagesPort로 어댑트한다.
//
// 실측(스파이크, 2026-07)으로 확정한 호출 규약:
//  - input()은 타입상 ReadableStream이지만 런타임은 ArrayBuffer를 수용한다.
//  - output()은 Promise<ImageTransformationResult>이므로 반드시 await 한다.
//  - 결과 바이트는 .image()(ReadableStream)로 읽는다. .response()는 원시 rgba에서
//    비정상 상태의 Response를 만들어 로컬 dev를 깨뜨리므로 사용하지 않는다.
export class CloudflareImagesAdapter implements ImagesPort {
  constructor(private readonly binding: ImagesBinding) {}

  async transform(
    source: ArrayBuffer,
    params: ImageTransformParams,
  ): Promise<ArrayBuffer> {
    const result = await this.binding
      .input(source as unknown as ReadableStream<Uint8Array>)
      .transform({
        width: params.width,
        height: params.height,
        fit: params.fit,
      })
      .output({ format: params.format as ImageOutputOptions['format'] });

    return new Response(result.image()).arrayBuffer();
  }
}
