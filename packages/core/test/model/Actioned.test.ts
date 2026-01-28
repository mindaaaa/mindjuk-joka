import {Actioned} from "../../src/model/Actioned";
import {User} from "../../src/model/User";

describe("Actioned", () => {
  describe("from", () => {
    it("유효한 파라미터로 Actioned 객체를 생성한다", () => {
      const at = new Date();
      const user = User.from({
        id: 1,
        cid: "user-123",
        name: "홍길동",
        email: "test@example.com",
      });
      const actioned = Actioned.from({ at, by: user });

      expect(actioned).toBeInstanceOf(Actioned);
      expect(actioned.at.getTime()).toBe(at.getTime());
      expect(actioned.by.id).toBe(user.id);
      expect(actioned.by.name).toBe(user.name);
      expect(actioned.by.email).toBe(user.email);
    });

    it("at이 누락되어도 Actioned 객체를 생성한다", () => {
      const current = Date.now();
      const user = User.from({
        id: 1,
        cid: "user-123",
        name: "홍길동",
        email: "test@example.com",
      });
      const actioned = Actioned.from({ by: user });

      expect(actioned).toBeInstanceOf(Actioned);
      expect(actioned.at.getTime()).toBeGreaterThanOrEqual(current);
      expect(actioned.by.id).toBe(user.id);
      expect(actioned.by.name).toBe(user.name);
      expect(actioned.by.email).toBe(user.email);
    });
  });

  describe("data", () => {
    it("객체 데이터를 반환한다", () => {
      const at = new Date();
      const user = User.from({
        id: 1,
        cid: "user-123",
        name: "홍길동",
        email: "test@example.com",
      });
      const data = Actioned.from({ at, by: user })
        .data;

      expect(data.at.getTime()).toBe(at.getTime());
      expect(data.by.id).toBe(user.id);
      expect(data.by.name).toBe(user.name);
      expect(data.by.email).toBe(user.email.value);
    });
  });
});
