import { InvalidArgumentException } from '@joka/core/src/exception';

import { UserEventRepository } from '../../src/infrastructure/persistence/user-event.repository';
import { UserEventService } from '../../src/service/user-event.service';

const createMockUser = () => ({
  id: 1,
  cid: 'user-123',
  name: 'tester',
  email: { value: 'test@example.com' },
});

const createMockAlbum = () => ({
  id: 1,
  cid: 'album-123',
  name: '테스트 앨범',
  description: '테스트용 앨범',
  isDeleted: false,
});

const createMockContext = () => ({
  album: createMockAlbum(),
  user: createMockUser(),
});

jest.mock('../../src/domain/UserEvent', () => ({
  UserEvent: {
    from: jest.fn((params) => ({
      albumId: params.album.id,
      event: params.event,
      created: { at: new Date(), by: params.user },
    })),
  },
}));

describe('UserEventService', () => {
  let service: UserEventService;
  let mockRepository: jest.Mocked<UserEventRepository>;

  beforeEach(() => {
    mockRepository = {
      insertMany: jest.fn(),
    } as unknown as jest.Mocked<UserEventRepository>;

    service = new UserEventService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('events를 UserEvent로 매핑하고 repository.insertMany를 호출한다', async () => {
      // given
      const context = createMockContext();
      const request = {
        events: [
          { name: 'list.view', timestamp: 1, userRole: 'EDITOR' as const },
          { name: 'detail.view', timestamp: 2, userRole: 'VIEWER' as const },
        ],
      };
      // @ts-ignore
      mockRepository.insertMany.mockResolvedValue(undefined);

      // when
      const result = await service.create(context as any, request);

      // then
      expect(result).toBeNull();
      expect(mockRepository.insertMany).toHaveBeenCalledTimes(1);
      const inserted = mockRepository.insertMany.mock.calls[0][0];
      expect(inserted).toHaveLength(2);
      expect(inserted[0].event.name).toBe('list.view');
      expect(inserted[1].event.name).toBe('detail.view');
    });

    it('빈 events 배열이면 InvalidArgumentException을 던지고 insertMany를 호출하지 않는다', async () => {
      // given
      const context = createMockContext();
      const request = { events: [] };

      // when & then
      await expect(service.create(context as any, request)).rejects.toThrow(
        InvalidArgumentException,
      );
      expect(mockRepository.insertMany).not.toHaveBeenCalled();
    });
  });
});
