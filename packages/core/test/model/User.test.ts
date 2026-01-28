import {User} from "../../src/model/User";
import {Email} from "../../src/model/Email";

describe("User", () => {
  describe("from", () => {
    it("유효한 파라미터로 User 객체를 생성한다", () => {
      const email = "test@example.com";
      const user = User.from({
        id: "user-123",
        name: "홍길동",
        email,
      });

      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe("user-123");
      expect(user.name).toBe("홍길동");
      expect(user.email).toStrictEqual(Email.from(email));
    });
  });

  describe("data", () => {
    it("객체 데이터를 반환한다", () => {
      const email = "test@example.com";
      const user = User.from({
        id: "user-123",
        name: "홍길동",
        email,
      });

      expect(user.data.id).toBe(user.id);
      expect(user.data.name).toBe(user.name);
      expect(user.data.email).toBe(user.email.value);
    });
  });
});
