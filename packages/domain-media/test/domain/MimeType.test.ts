import { MimeType } from "../../src/domain/MimeType";

describe("MimeType", () => {
    describe("from", () => {
        it("유효한 MIME 타입으로 MimeType 객체를 생성한다", () => {
            const mimeType = MimeType.from("image/png");

            expect(mimeType).toBeInstanceOf(MimeType);
            expect(mimeType.value).toBe("image/png");
        });

        it("다양한 유효한 MIME 타입을 처리한다", () => {
            const validMimeTypes = [
                "image/jpeg",
                "image/png",
                "image/gif",
                "video/mp4",
                "audio/mpeg",
                "application/pdf",
                "text/plain",
            ];

            validMimeTypes.forEach(mimeTypeStr => {
                const mimeType = MimeType.from(mimeTypeStr);
                expect(mimeType.value).toBe(mimeTypeStr);
            });
        });

        it("빈 문자열인 경우 에러를 던진다", () => {
            expect(() => MimeType.from("")).toThrow("mimeType is empty");
            expect(() => MimeType.from("   ")).toThrow("mimeType is empty");
        });

        it("유효하지 않은 MIME 타입인 경우 에러를 던진다", () => {
            expect(() => MimeType.from("invalid")).toThrow("is invalid for mimeType");
            expect(() => MimeType.from("image")).toThrow("is invalid for mimeType");
            expect(() => MimeType.from("image/")).toThrow("is invalid for mimeType");
        });

        it("문자열이 아닌 값이 전달되면 에러를 던진다", () => {
            expect(() => MimeType.from(123)).toThrow();
            expect(() => MimeType.from(null)).toThrow();
            expect(() => MimeType.from(undefined)).toThrow();
        });
    });

    describe("type", () => {
        it("MIME 타입의 메인 타입을 반환한다", () => {
            const imageMime = MimeType.from("image/png");
            const videoMime = MimeType.from("video/mp4");
            const audioMime = MimeType.from("audio/mpeg");

            expect(imageMime.type).toBe("image");
            expect(videoMime.type).toBe("video");
            expect(audioMime.type).toBe("audio");
        });
    });

    describe("subType", () => {
        it("MIME 타입의 서브 타입을 반환한다", () => {
            const pngMime = MimeType.from("image/png");
            const jpegMime = MimeType.from("image/jpeg");
            const mp4Mime = MimeType.from("video/mp4");

            expect(pngMime.subType).toBe("png");
            expect(jpegMime.subType).toBe("jpeg");
            expect(mp4Mime.subType).toBe("mp4");
        });
    });
});
