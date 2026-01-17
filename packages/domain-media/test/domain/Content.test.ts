import { Content } from "../../src/domain/Content";
import { Thumbnail } from "../../src/domain/Thumbnail";
import { Url } from "@joka/core/src/model/Url";
import { MimeType } from "../../src/domain/MimeType";

describe("Content", () => {
    describe("from", () => {
        it("썸네일이 있는 Content 객체를 생성한다", () => {
            const thumbnail = Thumbnail.from({
                url: "https://example.com/thumbnail.jpg",
                size: 512,
                eTag: "thumb-etag",
                mimeType: "image/jpeg",
                blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
            });

            const content = Content.from({
                url: "https://example.com/image.jpg",
                size: 2048,
                eTag: "content-etag",
                mimeType: "image/jpeg",
                thumbnail,
            });

            expect(content).toBeInstanceOf(Content);
            expect(content.url).toBeInstanceOf(Url);
            expect(content.url.path).toBe("https://example.com/image.jpg");
            expect(content.size).toBe(2048);
            expect(content.eTag).toBe("content-etag");
            expect(content.mimeType).toBeInstanceOf(MimeType);
            expect(content.mimeType.value).toBe("image/jpeg");
            expect(content.thumbnail).toBe(thumbnail);
        });

        it("썸네일이 없는 Content 객체를 생성한다", () => {
            const content = Content.from({
                url: "https://example.com/video.mp4",
                size: 10240,
                eTag: "video-etag",
                mimeType: "video/mp4",
                thumbnail: null,
            });

            expect(content.thumbnail).toBeNull();
            expect(content.url.path).toBe("https://example.com/video.mp4");
            expect(content.mimeType.value).toBe("video/mp4");
        });

        it("다양한 미디어 타입의 Content를 생성한다", () => {
            const testCases = [
                {
                    url: "https://cdn.example.com/photo.png",
                    size: 3072,
                    eTag: "etag-1",
                    mimeType: "image/png",
                    thumbnail: null,
                },
                {
                    url: "https://cdn.example.com/audio.mp3",
                    size: 5120,
                    eTag: "etag-2",
                    mimeType: "audio/mpeg",
                    thumbnail: null,
                },
            ];

            testCases.forEach(params => {
                const content = Content.from(params);
                expect(content.size).toBe(params.size);
                expect(content.eTag).toBe(params.eTag);
                expect(content.mimeType.value).toBe(params.mimeType);
            });
        });

        it("유효하지 않은 URL인 경우 에러를 던진다", () => {
            expect(() =>
                Content.from({
                    url: "invalid-url",
                    size: 1024,
                    eTag: "abc",
                    mimeType: "image/jpeg",
                    thumbnail: null,
                })
            ).toThrow();
        });

        it("유효하지 않은 MIME 타입인 경우 에러를 던진다", () => {
            expect(() =>
                Content.from({
                    url: "https://example.com/content.jpg",
                    size: 1024,
                    eTag: "abc",
                    mimeType: "invalid/type",
                    thumbnail: null,
                })
            ).toThrow();
        });
    });
});
