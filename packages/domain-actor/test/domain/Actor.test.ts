import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';

import { Actor } from '../../src/domain/Actor';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const createAlbum = () =>
  Album.from({
    id: 1,
    cid: 'album-123',
    name: '우리 조카',
    description: '우리 조카를 위한 앨범',
    isDeleted: false,
  });

const createUser = () =>
  User.from({
    id: 1,
    cid: 'user-123',
    name: '홍길동',
    email: 'test@example.com',
  });

describe('Actor', () => {
  describe('from', () => {
    it('유효한 파라미터로 Actor 객체를 생성한다', () => {
      // given
      const album = createAlbum();
      const user = createUser();

      // when
      const actor = Actor.from({ album, user, role: 'ADMIN' });

      // then
      expect(actor).toBeInstanceOf(Actor);
      expect(actor.album).toBe(album);
      expect(actor.user).toBe(user);
      expect(actor.role).toBe('ADMIN');
    });

    it('traceId가 UUIDv7 형태로 자동 생성된다', () => {
      // given
      const album = createAlbum();
      const user = createUser();

      // when
      const actor = Actor.from({ album, user, role: 'VIEWER' });

      // then
      expect(actor.traceId).toMatch(UUID_REGEX);
    });

    it('매 생성마다 서로 다른 traceId를 갖는다', () => {
      // given
      const album = createAlbum();
      const user = createUser();

      // when
      const actor1 = Actor.from({ album, user, role: 'VIEWER' });
      const actor2 = Actor.from({ album, user, role: 'VIEWER' });

      // then
      expect(actor1.traceId).not.toBe(actor2.traceId);
    });
  });

  describe('isAdmin', () => {
    it('ADMIN 역할이면 true를 반환한다', () => {
      // given
      const actor = Actor.from({
        album: createAlbum(),
        user: createUser(),
        role: 'ADMIN',
      });

      // when
      const result = actor.isAdmin();

      // then
      expect(result).toBe(true);
    });

    it('EDITOR 역할이면 false를 반환한다', () => {
      // given
      const actor = Actor.from({
        album: createAlbum(),
        user: createUser(),
        role: 'EDITOR',
      });

      // when
      const result = actor.isAdmin();

      // then
      expect(result).toBe(false);
    });

    it('VIEWER 역할이면 false를 반환한다', () => {
      // given
      const actor = Actor.from({
        album: createAlbum(),
        user: createUser(),
        role: 'VIEWER',
      });

      // when
      const result = actor.isAdmin();

      // then
      expect(result).toBe(false);
    });
  });

  describe('canEdit', () => {
    it('ADMIN 역할이면 true를 반환한다', () => {
      // given
      const actor = Actor.from({
        album: createAlbum(),
        user: createUser(),
        role: 'ADMIN',
      });

      // when
      const result = actor.canEdit();

      // then
      expect(result).toBe(true);
    });

    it('EDITOR 역할이면 true를 반환한다', () => {
      // given
      const actor = Actor.from({
        album: createAlbum(),
        user: createUser(),
        role: 'EDITOR',
      });

      // when
      const result = actor.canEdit();

      // then
      expect(result).toBe(true);
    });

    it('VIEWER 역할이면 false를 반환한다', () => {
      // given
      const actor = Actor.from({
        album: createAlbum(),
        user: createUser(),
        role: 'VIEWER',
      });

      // when
      const result = actor.canEdit();

      // then
      expect(result).toBe(false);
    });
  });

  describe('canRead', () => {
    it('ADMIN 역할이면 true를 반환한다', () => {
      // given
      const actor = Actor.from({
        album: createAlbum(),
        user: createUser(),
        role: 'ADMIN',
      });

      // when
      const result = actor.canRead();

      // then
      expect(result).toBe(true);
    });

    it('EDITOR 역할이면 true를 반환한다', () => {
      // given
      const actor = Actor.from({
        album: createAlbum(),
        user: createUser(),
        role: 'EDITOR',
      });

      // when
      const result = actor.canRead();

      // then
      expect(result).toBe(true);
    });

    it('VIEWER 역할이면 true를 반환한다', () => {
      // given
      const actor = Actor.from({
        album: createAlbum(),
        user: createUser(),
        role: 'VIEWER',
      });

      // when
      const result = actor.canRead();

      // then
      expect(result).toBe(true);
    });
  });

  describe('data', () => {
    it('직렬화된 데이터를 반환한다', () => {
      // given
      const album = createAlbum();
      const user = createUser();

      // when
      const actor = Actor.from({ album, user, role: 'EDITOR' });

      // then
      expect(actor.data.traceId).toBe(actor.traceId);
      expect(actor.data.album).toStrictEqual(album.data);
      expect(actor.data.user).toStrictEqual(user.data);
      expect(actor.data.role).toBe('EDITOR');
    });
  });
});
