import { Album } from "../../src/model/Album";

describe("Album", () => {
  describe("from", () => {
    it("유효한 파라미터로 Album 객체를 생성한다", () => {
      const album = Album.from({
        id: 1,
        cid: "album-123",
        name: "우리 조카",
        description: "우리 조카를 위한 앨범",
        isDeleted: false,
      });

      expect(album).toBeInstanceOf(Album);
      expect(album.id).toBe(1);
      expect(album.cid).toBe("album-123");
      expect(album.name).toBe("우리 조카");
      expect(album.description).toBe("우리 조카를 위한 앨범");
      expect(album.isDeleted).toBe(false);
    });
  });

  describe("data", () => {
    it("객체 데이터를 반환한다", () => {
      const album = Album.from({
        id: 1,
        cid: "album-123",
        name: "우리 조카",
        description: "우리 조카를 위한 앨범",
        isDeleted: false,
      });

      expect(album.data.id).toBe(album.id);
      expect(album.data.cid).toBe(album.cid);
      expect(album.data.name).toBe(album.name);
      expect(album.data.description).toBe(album.description);
      expect(album.data.isDeleted).toBe(album.isDeleted);
    });
  });
});
