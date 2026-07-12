import { UserEvent } from '../../src/domain/UserEvent';

jest.mock('@joka/core/src/model/Actioned', () => {
  const { z: zod } = jest.requireActual('zod');
  return {
    Actioned: {
      from: jest.fn((params) => ({
        at: params.at || new Date('2024-01-01'),
        by: params.by,
      })),
      Schema: zod.object({
        at: zod.date(),
        by: zod.object({
          id: zod.number(),
          cid: zod.string(),
          name: zod.string(),
          email: zod.string(),
        }),
      }),
    },
  };
});

const createMockUser = (id: number = 1) => ({
  id,
  cid: `user-cid-${id}`,
  name: `user-${id}`,
  email: { value: `user${id}@example.com` },
});

const createMockAlbum = (id: number = 1) => ({
  id,
  cid: `album-cid-${id}`,
  name: `album-${id}`,
  description: '테스트 앨범',
  isDeleted: false,
});

const createParams = (event: Record<string, unknown> = {}) => ({
  album: createMockAlbum(),
  user: createMockUser(),
  event: {
    name: 'list.view',
    timestamp: 1700000000000,
    userRole: 'EDITOR',
    ...event,
  },
});

describe('UserEvent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('from', () => {
    it('유효한 이벤트로 UserEvent를 생성한다', () => {
      // given
      const params = createParams();

      // when
      const userEvent = UserEvent.from(params as any);

      // then
      expect(userEvent).toBeInstanceOf(UserEvent);
      expect(userEvent.albumId).toBe(1);
      expect(userEvent.event.name).toBe('list.view');
      expect(userEvent.event.timestamp).toBe(1700000000000);
      expect(userEvent.event.userRole).toBe('EDITOR');
      expect(userEvent.created.by.id).toBe(1);
    });

    it('name/timestamp/userRole 외의 추가 필드를 그대로 보존한다', () => {
      // given
      const params = createParams({
        sessionId: 'session-123',
        route: '/albums/1',
        appVersion: '1.2.3',
        props: { scrollDepth: 80 },
      });

      // when
      const userEvent = UserEvent.from(params as any);

      // then
      expect(userEvent.event.sessionId).toBe('session-123');
      expect(userEvent.event.route).toBe('/albums/1');
      expect(userEvent.event.appVersion).toBe('1.2.3');
      expect(userEvent.event.props).toEqual({ scrollDepth: 80 });
      expect(userEvent.data.event.props).toEqual({ scrollDepth: 80 });
    });

    it('name이 비어 있으면 예외를 던진다', () => {
      // given
      const params = createParams({ name: '' });

      // when & then
      expect(() => UserEvent.from(params as any)).toThrow();
    });

    it('timestamp가 숫자가 아니면 예외를 던진다', () => {
      // given
      const params = createParams({ timestamp: 'not-a-number' });

      // when & then
      expect(() => UserEvent.from(params as any)).toThrow();
    });

    it('userRole이 허용되지 않은 값이면 예외를 던진다', () => {
      // given
      const params = createParams({ userRole: 'GUEST' });

      // when & then
      expect(() => UserEvent.from(params as any)).toThrow();
    });
  });
});
