import { ForbiddenException } from '@joka/core/src/exception';

import { MediaRepository } from '../../src/infrastructure/persistence/media.repository';
import { MediaService } from '../../src/service/media.service';

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

const createMockMedia = (overrides: Record<string, any> = {}) => ({
  id: 1,
  cid: 'media-123',
  albumId: 1,
  description: '미디어 설명',
  state: 'DRAFT',
  version: 1,
  content: null,
  isFavorite: false,
  created: { at: new Date(), by: createMockUser() },
  updated: { at: new Date(), by: createMockUser() },
  isOwnedBy: jest.fn().mockReturnValue(true),
  updateBy: jest.fn().mockReturnThis(),
  data: {},
  ...overrides,
});

const createMockContext = () => ({
  album: createMockAlbum(),
  user: createMockUser(),
});

jest.mock('../../src/domain/Media', () => ({
  DraftMedia: {
    from: jest.fn((params) => ({
      albumId: params.album.id,
      description: params.description,
      state: 'DRAFT',
      content: null,
      isFavorite: false,
    })),
  },
  Media: {
    State: {
      DRAFT: 'DRAFT',
      PREPARING: 'PREPARING',
      COMPLETE: 'COMPLETE',
    },
  },
}));

jest.mock('../../src/domain/ListMediaCondition', () => ({
  ListMediaCondition: {
    from: jest.fn((params) => ({
      limit: params.limit || 20,
      filter: params.filter,
      cursor: params.cursor,
      sortOrder: params.sortOrder || 'desc',
    })),
  },
}));

describe('MediaService', () => {
  let service: MediaService;
  let mockRepository: jest.Mocked<MediaRepository>;

  beforeEach(() => {
    mockRepository = {
      insert: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      findByCid: jest.fn(),
      update: jest.fn(),
      deleteOne: jest.fn(),
    } as unknown as jest.Mocked<MediaRepository>;

    service = new MediaService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('DraftMedia를 생성하고 repository.insert를 호출한다', async () => {
      // given
      const context = createMockContext();
      const request = { description: '새 미디어' };
      const expectedMedia = createMockMedia({ description: '새 미디어' });
      mockRepository.insert.mockResolvedValue(expectedMedia as any);

      // when
      const result = await service.create(context as any, request);

      // then
      expect(mockRepository.insert).toHaveBeenCalledTimes(1);
      expect(result).toBe(expectedMedia);
    });
  });

  describe('list', () => {
    it('조건에 맞는 미디어 목록을 반환한다', async () => {
      // given
      const context = createMockContext();
      const request = { limit: 10, sortOrder: 'desc' };
      const mockItems = [createMockMedia(), createMockMedia({ id: 2 })];
      mockRepository.findMany.mockResolvedValue({
        items: mockItems as any,
        nextCursor: null,
      });

      // when
      const result = await service.list(context as any, request);

      // then
      expect(mockRepository.findMany).toHaveBeenCalledTimes(1);
      expect(result.items).toBe(mockItems);
      expect(result.pagination.size).toBe(10);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.nextCursor).toBeNull();
    });

    it('다음 페이지가 있으면 nextCursor를 반환한다', async () => {
      // given
      const context = createMockContext();
      const request = { limit: 10 };
      const mockItems = [createMockMedia()];
      const nextCursor = { cid: 'next-cursor-123' };
      mockRepository.findMany.mockResolvedValue({
        items: mockItems as any,
        nextCursor,
      });

      // when
      const result = await service.list(context as any, request);

      // then
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.nextCursor).toBe('next-cursor-123');
    });

    it('states 필터를 전달한다', async () => {
      // given
      const context = createMockContext();
      const request = { states: ['DRAFT', 'COMPLETE'] };
      mockRepository.findMany.mockResolvedValue({
        items: [],
        nextCursor: null,
      });

      // when
      await service.list(context as any, request);

      // then
      expect(mockRepository.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('cid로 미디어를 조회한다', async () => {
      // given
      const context = createMockContext();
      const request = { cid: 'media-123' };
      const expectedMedia = createMockMedia();
      mockRepository.findOne.mockResolvedValue(expectedMedia as any);

      // when
      const result = await service.get(context as any, request);

      // then
      expect(mockRepository.findOne).toHaveBeenCalledWith(1, 'media-123');
      expect(result).toBe(expectedMedia);
    });
  });

  describe('getByCid', () => {
    it('album 무관하게 cid로 미디어를 조회한다(권한 검사 없음)', async () => {
      // given
      const expectedMedia = createMockMedia();
      mockRepository.findByCid.mockResolvedValue(expectedMedia as any);

      // when
      const result = await service.getByCid('media-123');

      // then
      expect(mockRepository.findByCid).toHaveBeenCalledWith('media-123');
      expect(result).toBe(expectedMedia);
    });
  });

  describe('attachThumbnail', () => {
    it('content에 thumbnail을 부착한 뒤 repository.update를 호출한다', async () => {
      // given
      const thumbnail = { blurhash: 'LEHV6nWB' };
      const attachedContent = { withThumbnail: true };
      const media = createMockMedia({
        content: {
          attachThumbnail: jest.fn().mockReturnValue(attachedContent),
        },
        setContent: jest.fn().mockReturnThis(),
      });
      const updatedMedia = createMockMedia({ state: 'COMPLETE' });
      mockRepository.update.mockResolvedValue(updatedMedia as any);

      // when
      const result = await service.attachThumbnail(
        media as any,
        thumbnail as any,
      );

      // then
      // @ts-ignore
      expect(media.content.attachThumbnail).toHaveBeenCalledWith(thumbnail);
      // @ts-ignore
      expect(media.setContent).toHaveBeenCalledWith(attachedContent);
      expect(mockRepository.update).toHaveBeenCalledWith(media);
      expect(result).toBe(updatedMedia);
    });
  });

  describe('update', () => {
    it('소유자가 미디어를 업데이트한다', async () => {
      // given
      const context = createMockContext();
      const foundMedia = createMockMedia();
      const updatedMedia = createMockMedia({ description: '수정됨' });
      foundMedia.updateBy.mockReturnValue(updatedMedia);

      mockRepository.findOne.mockResolvedValue(foundMedia as any);
      mockRepository.update.mockResolvedValue(updatedMedia as any);

      const request = {
        cid: 'media-123',
        description: '수정됨',
        isForced: false,
      };

      // when
      const result = await service.update(context as any, request as any);

      // then
      expect(mockRepository.findOne).toHaveBeenCalledWith(1, 'media-123');
      expect(foundMedia.updateBy).toHaveBeenCalledWith(request);
      expect(mockRepository.update).toHaveBeenCalledWith(updatedMedia);
      expect(result).toBe(updatedMedia);
    });

    it('소유자가 아니어도 isForced가 true이면 업데이트한다', async () => {
      // given
      const context = createMockContext();
      const foundMedia = createMockMedia({
        isOwnedBy: jest.fn().mockReturnValue(false),
      });
      const updatedMedia = createMockMedia({ description: '수정됨' });
      foundMedia.updateBy.mockReturnValue(updatedMedia);

      mockRepository.findOne.mockResolvedValue(foundMedia as any);
      mockRepository.update.mockResolvedValue(updatedMedia as any);

      const request = {
        cid: 'media-123',
        description: '수정됨',
        isForced: true,
      };

      // when
      const result = await service.update(context as any, request as any);

      // then
      expect(mockRepository.update).toHaveBeenCalledWith(updatedMedia);
      expect(result).toBe(updatedMedia);
    });

    it('소유자가 아니고 isForced가 false이면 ForbiddenException을 던진다', async () => {
      // given
      const context = createMockContext();
      const foundMedia = createMockMedia({
        isOwnedBy: jest.fn().mockReturnValue(false),
      });

      mockRepository.findOne.mockResolvedValue(foundMedia as any);

      const request = {
        cid: 'media-123',
        description: '수정됨',
        isForced: false,
      };

      // when & then
      await expect(
        service.update(context as any, request as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('소유자가 미디어를 삭제한다', async () => {
      // given
      const context = createMockContext();
      const request = { cid: 'media-123', isForced: false };
      const targetMedia = createMockMedia();
      mockRepository.findOne.mockResolvedValue(targetMedia as any);
      mockRepository.deleteOne.mockResolvedValue(null);

      // when
      const result = await service.delete(context as any, request);

      // then
      expect(mockRepository.findOne).toHaveBeenCalledWith(1, 'media-123');
      expect(mockRepository.deleteOne).toHaveBeenCalledWith(targetMedia);
      expect(result).toBeNull();
    });

    it('소유자가 아니어도 isForced가 true이면 삭제한다', async () => {
      // given
      const context = createMockContext();
      const request = { cid: 'media-123', isForced: true };
      const targetMedia = createMockMedia({
        isOwnedBy: jest.fn().mockReturnValue(false),
      });
      mockRepository.findOne.mockResolvedValue(targetMedia as any);
      mockRepository.deleteOne.mockResolvedValue(null);

      // when
      const result = await service.delete(context as any, request);

      // then
      expect(mockRepository.deleteOne).toHaveBeenCalledWith(targetMedia);
      expect(result).toBeNull();
    });

    it('소유자가 아니고 isForced가 false이면 ForbiddenException을 던진다', async () => {
      // given
      const context = createMockContext();
      const request = { cid: 'media-123', isForced: false };
      const targetMedia = createMockMedia({
        isOwnedBy: jest.fn().mockReturnValue(false),
      });
      mockRepository.findOne.mockResolvedValue(targetMedia as any);

      // when & then
      await expect(service.delete(context as any, request)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
