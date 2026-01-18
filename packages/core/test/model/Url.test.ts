import { Url } from "../../src/model/Url";

describe("Url", () => {
    describe("from", () => {
        it("유효한 http URL로 Url 객체를 생성한다", () => {
            const url = Url.from("http://example.com");

            expect(url).toBeInstanceOf(Url);
            expect(url.path).toBe("http://example.com/");
        });

        it("유효한 https URL로 Url 객체를 생성한다", () => {
            const url = Url.from("https://example.com");

            expect(url).toBeInstanceOf(Url);
            expect(url.path).toBe("https://example.com/");
        });

        it("다양한 유효한 URL 형식을 처리한다", () => {
            const validUrls = [
                "http://localhost:3000",
                "https://example.com/path",
                "https://example.com/path?query=value",
                "https://sub.example.com/path#fragment",
            ];

            validUrls.forEach(urlStr => {
                const url = Url.from(urlStr);
                expect(url.path).toBeTruthy();
            });
        });

        it("빈 문자열인 경우 에러를 던진다", () => {
            expect(() => Url.from("")).toThrow("Url path is empty");
            expect(() => Url.from("   ")).toThrow("Url path is empty");
        });

        it("http/https가 아닌 프로토콜은 에러를 던진다", () => {
            expect(() => Url.from("ftp://example.com")).toThrow("is not a valid protocol");
            expect(() => Url.from("file:///path/to/file")).toThrow("is not a valid protocol");
        });

        it("유효하지 않은 URL 형식인 경우 에러를 던진다", () => {
            expect(() => Url.from("not-a-url")).toThrow();
            expect(() => Url.from("example.com")).toThrow();
        });

        it("문자열이 아닌 값이 전달되면 에러를 던진다", () => {
            expect(() => Url.from(123)).toThrow();
            expect(() => Url.from(null)).toThrow();
            expect(() => Url.from(undefined)).toThrow();
        });
    });

    describe("path", () => {
        it("URL의 전체 경로를 반환한다", () => {
            const url = Url.from("https://example.com/path?query=value");
            
            expect(url.path).toBe("https://example.com/path?query=value");
        });
    });
});
