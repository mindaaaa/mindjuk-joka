import { Thumbnail } from "../../src/domain/Thumbnail";
import { Url } from "@joka/core/src/model/Url";
import { MimeType } from "../../src/domain/MimeType";

describe("Thumbnail", () => {
    describe("from", () => {
        it("유효한 파라미터로 Thumbnail 객체를 생성한다", () => {
            const thumbnail = Thumbnail.from({
                url: "https://example.com/thumbnail.jpg",
                size: 1024,
                eTag: "abc123",
                mimeType: "image/jpeg",
                blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
            });

            expect(thumbnail).toBeInstanceOf(Thumbnail);
            expect(thumbnail.url).toBeInstanceOf(Url);
            expect(thumbnail.url.path).toBe("https://example.com/thumbnail.jpg");
            expect(thumbnail.size).toBe(1024);
            expect(thumbnail.eTag).toBe("abc123");
            expect(thumbnail.mimeType).toBeInstanceOf(MimeType);
            expect(thumbnail.mimeType.value).toBe("image/jpeg");
            expect(thumbnail.blurhash).toBe("L6PZfSi_.AyE_3t7t7R**0o#DgR4");
        });

        it("다양한 이미지 형식의 썸네일을 생성한다", () => {
            const testCases = [
                {
                    url: "https://cdn.example.com/thumb1.png",
                    size: 2048,
                    eTag: "etag-1",
                    mimeType: "image/png",
                    blurhash: "LKO2?U%2Tw=w]~RBVZRi};RPxuwH",
                },
                {
                    url: "https://cdn.example.com/thumb2.webp",
                    size: 512,
                    eTag: "etag-2",
                    mimeType: "image/webp",
                    blurhash: "L6PZfSjE.AyE_3t7t7R**0o#DgR4",
                },
            ];

            testCases.forEach(params => {
                const thumbnail = Thumbnail.from(params);
                expect(thumbnail.size).toBe(params.size);
                expect(thumbnail.eTag).toBe(params.eTag);
                expect(thumbnail.blurhash).toBe(params.blurhash);
            });
        });

        it("유효하지 않은 URL인 경우 에러를 던진다", () => {
            expect(() =>
                Thumbnail.from({
                    url: "invalid-url",
                    size: 1024,
                    eTag: "abc",
                    mimeType: "image/jpeg",
                    blurhash: "LKO2?U%2Tw=w",
                })
            ).toThrow();
        });

        it("유효하지 않은 MIME 타입인 경우 에러를 던진다", () => {
            expect(() =>
                Thumbnail.from({
                    url: "https://example.com/thumb.jpg",
                    size: 1024,
                    eTag: "abc",
                    mimeType: "invalid/type",
                    blurhash: "LKO2?U%2Tw=w",
                })
            ).toThrow();
        });
    });
});
