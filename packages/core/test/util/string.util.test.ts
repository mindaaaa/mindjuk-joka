import { isNotEmpty, isEmpty } from "../../src/util/string.util";

describe("string.util", () => {
    describe("isNotEmpty", () => {
        it("빈 문자열이 아닌 경우 true를 반환한다", () => {
            expect(isNotEmpty("hello")).toBe(true);
            expect(isNotEmpty("a")).toBe(true);
            expect(isNotEmpty("  hello  ")).toBe(true);
        });

        it("빈 문자열인 경우 false를 반환한다", () => {
            expect(isNotEmpty("")).toBe(false);
            expect(isNotEmpty("   ")).toBe(false);
            expect(isNotEmpty("\t")).toBe(false);
        });

        it("문자열이 아닌 값이 전달되면 에러를 던진다", () => {
            expect(() => isNotEmpty(123)).toThrow("value must be a string");
            expect(() => isNotEmpty(null)).toThrow("value must be a string");
            expect(() => isNotEmpty(undefined)).toThrow("value must be a string");
        });
    });

    describe("isEmpty", () => {
        it("빈 문자열인 경우 true를 반환한다", () => {
            expect(isEmpty("")).toBe(true);
            expect(isEmpty("   ")).toBe(true);
        });

        it("빈 문자열이 아닌 경우 false를 반환한다", () => {
            expect(isEmpty("hello")).toBe(false);
        });
    });
});
