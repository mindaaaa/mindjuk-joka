import { Email } from "../../src/model/Email";

describe("Email", () => {
    describe("from", () => {
        it("유효한 이메일로 Email 객체를 생성한다", () => {
            const email = Email.from("test@example.com");

            expect(email).toBeInstanceOf(Email);
            expect(email.value).toBe("test@example.com");
        });

        it("다양한 유효한 이메일 형식을 처리한다", () => {
            const validEmails = [
                "user@domain.com",
                "user.name@domain.com",
                "user+tag@domain.com",
                "user_name@domain.co.kr",
            ];

            validEmails.forEach(emailStr => {
                const email = Email.from(emailStr);
                expect(email.value).toBe(emailStr);
            });
        });

        it("유효하지 않은 이메일 형식인 경우 에러를 던진다", () => {
            expect(() => Email.from("invalid")).toThrow("is not a valid email");
            expect(() => Email.from("@example.com")).toThrow("is not a valid email");
            expect(() => Email.from("user@")).toThrow("is not a valid email");
            expect(() => Email.from("")).toThrow("is not a valid email");
        });

        it("빈 문자열이나 공백만 있는 경우 에러를 던진다", () => {
            expect(() => Email.from("   ")).toThrow();
        });

        it("문자열이 아닌 값이 전달되면 에러를 던진다", () => {
            expect(() => Email.from(123)).toThrow();
            expect(() => Email.from(null)).toThrow();
            expect(() => Email.from(undefined)).toThrow();
        });
    });
});
