import { Media } from "../../src/domain/Media";
import { User } from "@joka/core/src/model/User";
import {Content} from "../../src/domain/Content";

describe("Media", () => {
  const createTestUser = () => {
    return User.from({
      id: "user-123",
      name: "홍길동",
      email: "test@example.com",
    });
  };

  describe("from", () => {
    it("유효한 파라미터로 Media 객체를 생성한다", () => {
      const user = createTestUser();
      const media = Media.from({
        id: 1,
        description: "우리 아이의 첫 생일",
        user,
      });

      expect(media).toBeInstanceOf(Media);
      expect(media.id).toBe(1);
      expect(media.description).toBe("우리 아이의 첫 생일");
      expect(media.state).toBe("DRAFT");
      expect(media.content).toBeNull();
      expect(media.isFavorite).toBe(false);
    });

    it("생성 시 created 정보가 올바르게 설정된다", () => {
      const user = createTestUser();
      const beforeCreate = new Date();

      const media = Media.from({
        id: 1,
        description: "테스트 미디어",
        user,
      });

      const afterCreate = new Date();

      expect(media.created.at).toBeInstanceOf(Date);
      expect(media.created.at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(media.created.at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(media.created.by.id).toBe(user.id);
      expect(media.created.by.name).toBe(user.name);
      expect(media.created.by.email).toBe(user.email);
    });

    it("초기 상태는 항상 DRAFT이다", () => {
      const user = createTestUser();
      const media = Media.from({
        id: 1,
        description: "테스트",
        user,
      });

      expect(media.state).toBe("DRAFT");
    });

    it("초기 content는 항상 null이다", () => {
      const user = createTestUser();
      const media = Media.from({
        id: 1,
        description: "테스트",
        user,
      });

      expect(media.content).toBeNull();
    });

    it("초기 isFavorite는 항상 false이다", () => {
      const user = createTestUser();
      const media = Media.from({
        id: 1,
        description: "테스트",
        user,
      });

      expect(media.isFavorite).toBe(false);
    });

    it("다양한 설명을 가진 Media를 생성한다", () => {
      const user = createTestUser();
      const descriptions = [
        "첫돌 기념 사진",
        "가족 여행 in 제주도",
        "유치원 입학식",
      ];

      descriptions.forEach((description, index) => {
        const media = Media.from({
          id: index + 1,
          description,
          user,
        });

        expect(media.description).toBe(description);
        expect(media.id).toBe(index + 1);
      });
    });
  });

  describe("setContent", () => {
    it("content를 설정할 수 있다", () => {
      const content = Content.from({
        url: "https://example.com/image.jpg",
        size: 2048,
        eTag: "content-etag",
        mimeType: "image/jpeg",
        thumbnail: null,
      });
      const media = Media.from({
        id: 1,
        description: "테스트",
        user: createTestUser(),
      })
        .setContent(content);

      expect(media.content?.data).toStrictEqual(content?.data);
    });

    it("content 설정시 반환된 Media는 원본과 다른 객체이다", () => {
      const content = Content.from({
        url: "https://example.com/image.jpg",
        size: 2048,
        eTag: "content-etag",
        mimeType: "image/jpeg",
        thumbnail: null,
      });
      const original = Media.from({
        id: 1,
        description: "테스트",
        user: createTestUser(),
      });
      const newOne = original.setContent(content);

      expect(original.data).toStrictEqual({ ...newOne.data, content: null });
      expect(original).not.toBe(newOne);
    });
  });

  describe("isReadyToComplete", () => {
    it("상태가 DRAFT이고 content가 존재한다면 COMPLETE 상태로 전이할 수 있다", () => {
      const content = Content.from({
        url: "https://example.com/image.jpg",
        size: 2048,
        eTag: "content-etag",
        mimeType: "image/jpeg",
        thumbnail: null,
      });
      const media = Media.from({
        id: 1,
        description: "테스트",
        user: createTestUser(),
      })
        .setContent(content);

      expect(media.isReadyToComplete).toBe(true);
    });

    it("상태가 DRAFT이지만 content가 존재하지 않는다면 COMPLETE 상태로 전이할 수 없다", () => {
      const media = Media.from({
        id: 1,
        description: "테스트",
        user: createTestUser(),
      });

      expect(media.isReadyToComplete).toBe(false);
    });
  });

  describe("data", () => {
    it("객체 데이터를 반환한다", () => {
      const user = createTestUser();
      const media = Media.from({
        id: 1,
        description: "테스트",
        user,
      });
      const data = media.data;

      expect(data.id).toBe(media.id);
      expect(data.description).toBe(media.description);
      expect(data.state).toBe(media.state);
      expect(data.content).toBe(media.content);
      expect(data.isFavorite).toBe(media.isFavorite);
      expect(data.created).toStrictEqual(media.created.data);
    });
  });
});
