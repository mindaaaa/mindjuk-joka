import { User } from "../../src/model/User";
import { Email } from "../../src/model/Email";

describe("User", () => {
    describe("from", () => {
        it("유효한 파라미터로 User 객체를 생성한다", () => {
            const email = Email.from("test@example.com");
            const user = User.from({
                id: "user-123",
                name: "홍길동",
                email,
            });

            expect(user).toBeInstanceOf(User);
            expect(user.id).toBe("user-123");
            expect(user.name).toBe("홍길동");
            expect(user.email).toBe(email);
        });

        it("Email 객체를 포함한 User를 생성한다", () => {
            const email = Email.from("user@domain.com");
            const user = User.from({
                id: "1",
                name: "테스트",
                email,
            });

            expect(user.email).toBeInstanceOf(Email);
            expect(user.email.value).toBe("user@domain.com");
        });

        it("다양한 사용자 정보로 User를 생성한다", () => {
            const testCases = [
                { id: "user-1", name: "Alice", email: Email.from("alice@test.com") },
                { id: "user-2", name: "Bob", email: Email.from("bob@test.com") },
                { id: "admin", name: "관리자", email: Email.from("admin@example.com") },
            ];

            testCases.forEach(params => {
                const user = User.from(params);
                expect(user.id).toBe(params.id);
                expect(user.name).toBe(params.name);
                expect(user.email).toBe(params.email);
            });
        });
    });
});
