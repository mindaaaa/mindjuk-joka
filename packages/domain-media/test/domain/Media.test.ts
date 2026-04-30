import {
  ConflictException,
  IllegalStateException,
} from '@joka/core/src/exception';

import { Media, DraftMedia } from '../../src/domain/Media';
import { UpdateMediaRequest } from '../../src/domain/UpdateMediaRequest';

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

jest.mock('@joka/core/src/model/User', () => ({
  User: {
    from: jest.fn((params) => ({
      id: params.id,
      cid: params.cid,
      name: params.name,
      email: { value: params.email },
    })),
  },
}));

jest.mock('../../src/domain/Content', () => {
  const { z: zod } = jest.requireActual('zod');
  return {
    Content: {
      from: jest.fn((params) => ({
        ...params,
        data: {
          url: params.url?.path || params.url,
          size: params.size,
          eTag: params.eTag,
          mimeType: params.mimeType?.value || params.mimeType,
          thumbnail: params.thumbnail?.data || null,
        },
      })),
      Schema: zod.object({
        url: zod.string(),
        size: zod.number(),
        eTag: zod.string(),
        mimeType: zod.string(),
        thumbnail: zod.any().nullable(),
      }),
    },
  };
});

jest.mock('../../src/domain/Thumbnail', () => ({
  Thumbnail: {
    from: jest.fn((params) => ({
      ...params,
      data: {
        url: params.url,
        size: params.size,
        eTag: params.eTag,
        mimeType: params.mimeType,
        blurhash: params.blurhash,
      },
    })),
  },
}));

const createMockUser = (id: number = 1) => ({
  id,
  cid: `user-cid-${id}`,
  name: `user-${id}`,
  email: { value: `user${id}@example.com` },
});

const createMockActioned = (userId: number = 1, at?: Date) => ({
  at: at || new Date('2024-01-01'),
  by: createMockUser(userId),
});

const createMockContent = (hasThumbnail: boolean = true) => ({
  url: { path: 'http://example.com/content.mp4' },
  size: 10240,
  eTag: 'content-etag',
  mimeType: { value: 'video/mp4' },
  thumbnail: hasThumbnail
    ? {
        url: { path: 'http://example.com/thumbnail.png' },
        size: 512,
        eTag: 'thumb-etag',
        mimeType: { value: 'image/png' },
        blurhash: 'LEHV6nWB',
        data: {
          url: 'http://example.com/thumbnail.png',
          size: 512,
          eTag: 'thumb-etag',
          mimeType: 'image/png',
          blurhash: 'LEHV6nWB',
        },
      }
    : null,
  data: {
    url: 'http://example.com/content.mp4',
    size: 10240,
    eTag: 'content-etag',
    mimeType: 'video/mp4',
    thumbnail: hasThumbnail
      ? {
          url: 'http://example.com/thumbnail.png',
          size: 512,
          eTag: 'thumb-etag',
          mimeType: 'image/png',
          blurhash: 'LEHV6nWB',
        }
      : null,
  },
});

describe('DraftMedia', () => {
  describe('from', () => {
    it('유효한 파라미터로 DraftMedia 객체를 생성한다', () => {
      // given
      const params = {
        album: { id: 1, cid: 'album-123', name: '테스트 앨범' },
        description: '새 미디어 설명',
        user: createMockUser(),
      };

      // when
      const draft = DraftMedia.from(params as any);

      // then
      expect(draft).toBeInstanceOf(DraftMedia);
      expect(draft.albumId).toBe(1);
      expect(draft.description).toBe('새 미디어 설명');
      expect(draft.state).toBe('DRAFT');
      expect(draft.content).toBeNull();
      expect(draft.isFavorite).toBe(false);
    });
  });

  describe('data', () => {
    it('객체 데이터를 반환한다', () => {
      // given
      const params = {
        album: { id: 1, cid: 'album-123', name: '테스트 앨범' },
        description: '새 미디어 설명',
        user: createMockUser(),
      };
      const draft = DraftMedia.from(params as any);

      // when
      const data = draft.data;

      // then
      expect(data.albumId).toBe(1);
      expect(data.description).toBe('새 미디어 설명');
      expect(data.state).toBe('DRAFT');
      expect(data.content).toBeNull();
      expect(data.isFavorite).toBe(false);
    });
  });
});

describe('Media', () => {
  const createMediaParams = (overrides: Record<string, any> = {}) => ({
    id: 1,
    cid: 'media-123',
    albumId: 1,
    description: '미디어 설명',
    state: 'DRAFT',
    version: 1,
    content: null,
    isFavorite: false,
    created: {
      at: new Date('2024-01-01'),
      by: {
        id: 1,
        cid: 'user-123',
        name: 'tester',
        email: 'test@example.com',
      },
    },
    updated: {
      at: new Date('2024-01-02'),
      by: {
        id: 1,
        cid: 'user-123',
        name: 'tester',
        email: 'test@example.com',
      },
    },
    ...overrides,
  });

  describe('State', () => {
    it('DRAFT, PREPARING, COMPLETE 상태를 제공한다', () => {
      // given & when & then
      expect(Media.State.DRAFT).toBe('DRAFT');
      expect(Media.State.PREPARING).toBe('PREPARING');
      expect(Media.State.COMPLETE).toBe('COMPLETE');
    });
  });

  describe('from', () => {
    it('유효한 파라미터로 Media 객체를 생성한다', () => {
      // given
      const params = createMediaParams();

      // when
      const media = Media.from(params);

      // then
      expect(media).toBeInstanceOf(Media);
      expect(media.id).toBe(1);
      expect(media.cid).toBe('media-123');
      expect(media.albumId).toBe(1);
      expect(media.description).toBe('미디어 설명');
      expect(media.state).toBe('DRAFT');
      expect(media.version).toBe(1);
      expect(media.content).toBeNull();
      expect(media.isFavorite).toBe(false);
    });

    it('content가 있는 Media 객체를 생성한다', () => {
      // given
      const params = createMediaParams({
        content: {
          url: 'http://example.com/content.mp4',
          size: 10240,
          eTag: 'content-etag',
          mimeType: 'video/mp4',
          thumbnail: {
            url: 'http://example.com/thumb.png',
            size: 512,
            eTag: 'thumb-etag',
            mimeType: 'image/png',
            blurhash: 'LEHV6nWB',
          },
        },
      });

      // when
      const media = Media.from(params);

      // then
      expect(media.content).not.toBeNull();
    });

    it('created와 updated의 사용자가 다르면 IllegalStateException을 던진다', () => {
      // given
      const params = createMediaParams({
        updated: {
          at: new Date('2024-01-02'),
          by: {
            id: 2, // 다른 사용자
            cid: 'user-456',
            name: 'other',
            email: 'other@example.com',
          },
        },
      });

      // when & then
      expect(() => Media.from(params)).toThrow(IllegalStateException);
    });
  });

  describe('setVersion', () => {
    it('새로운 버전을 가진 Media를 반환한다', () => {
      // given
      const media = Media.from(createMediaParams());

      // when
      const updated = media.setVersion(2);

      // then
      expect(updated).toBeInstanceOf(Media);
      expect(updated.version).toBe(2);
      expect(updated.id).toBe(media.id);
    });
  });

  describe('setContent', () => {
    it('새로운 content를 가진 Media를 반환한다', () => {
      // given
      const media = Media.from(createMediaParams());
      const newContent = createMockContent();

      // when
      const updated = media.setContent(newContent as any);

      // then
      expect(updated).toBeInstanceOf(Media);
      expect(updated.content).toBe(newContent);
    });

    it('content를 null로 설정할 수 있다', () => {
      // given
      const media = Media.from(
        createMediaParams({ content: createMockContent() }),
      );

      // when
      const updated = media.setContent(null);

      // then
      expect(updated.content).toBeNull();
    });
  });

  describe('setUpdated', () => {
    it('새로운 updated를 가진 Media를 반환한다', () => {
      // given
      const media = Media.from(createMediaParams());
      const newUpdated = createMockActioned(1, new Date('2024-06-01'));

      // when
      const updated = media.setUpdated(newUpdated as any);

      // then
      expect(updated).toBeInstanceOf(Media);
      expect(updated.updated.at).toEqual(new Date('2024-06-01'));
    });
  });

  describe('updateBy', () => {
    it('UpdateMediaRequest로 Media를 업데이트한다', () => {
      // given
      const media = Media.from(createMediaParams());
      const request = {
        cid: 'media-123',
        description: '수정된 설명',
        state: 'PREPARING',
        shouldUpdateContent: false,
        content: null,
      } as unknown as UpdateMediaRequest;

      // when
      const updated = media.updateBy(request);

      // then
      expect(updated.description).toBe('수정된 설명');
      expect(updated.state).toBe('PREPARING');
    });

    it('cid가 일치하지 않으면 ConflictException을 던진다', () => {
      // given
      const media = Media.from(createMediaParams());
      const request = {
        cid: 'different-cid',
        description: '수정된 설명',
        state: undefined,
        shouldUpdateContent: false,
      } as unknown as UpdateMediaRequest;

      // when & then
      expect(() => media.updateBy(request)).toThrow(ConflictException);
    });

    it('유효하지 않은 상태 전이이면 ConflictException을 던진다', () => {
      // given
      const media = Media.from(createMediaParams({ state: 'PREPARING' }));
      const request = {
        cid: 'media-123',
        description: undefined,
        state: 'DRAFT', // PREPARING -> DRAFT는 불가
        shouldUpdateContent: false,
      } as unknown as UpdateMediaRequest;

      // when & then
      expect(() => media.updateBy(request)).toThrow(ConflictException);
    });

    it('shouldUpdateContent가 true이면 content를 업데이트한다', () => {
      // given
      const media = Media.from(createMediaParams());
      const newContent = createMockContent();
      const request = {
        cid: 'media-123',
        description: undefined,
        state: undefined,
        shouldUpdateContent: true,
        content: newContent,
      } as unknown as UpdateMediaRequest;

      // when
      const updated = media.updateBy(request);

      // then
      expect(updated.content).toBe(newContent);
    });
  });

  describe('isOwnedBy', () => {
    it('생성자와 같은 사용자이면 true를 반환한다', () => {
      // given
      const media = Media.from(createMediaParams());
      const user = createMockUser(1);

      // when & then
      expect(media.isOwnedBy(user as any)).toBe(true);
    });

    it('생성자와 다른 사용자이면 false를 반환한다', () => {
      // given
      const media = Media.from(createMediaParams());
      const otherUser = createMockUser(2);

      // when & then
      expect(media.isOwnedBy(otherUser as any)).toBe(false);
    });
  });

  describe('isReadyToComplete', () => {
    it('state가 PREPARING이고 content가 있으면 true를 반환한다', () => {
      // given
      const media = Media.from(
        createMediaParams({
          state: 'PREPARING',
          content: {
            url: 'http://example.com/content.mp4',
            size: 10240,
            eTag: 'etag',
            mimeType: 'video/mp4',
            thumbnail: null,
          },
        }),
      );

      // when & then
      expect(media.isReadyToComplete).toBe(true);
    });

    it('state가 PREPARING이 아니면 false를 반환한다', () => {
      // given
      const media = Media.from(
        createMediaParams({
          state: 'DRAFT',
          content: {
            url: 'http://example.com/content.mp4',
            size: 10240,
            eTag: 'etag',
            mimeType: 'video/mp4',
            thumbnail: null,
          },
        }),
      );

      // when & then
      expect(media.isReadyToComplete).toBe(false);
    });

    it('content가 없으면 false를 반환한다', () => {
      // given
      const media = Media.from(createMediaParams({ state: 'DRAFT' }));

      // when & then
      expect(media.isReadyToComplete).toBe(false);
    });
  });

  describe('hasNoContent', () => {
    it('content가 없으면 true를 반환한다', () => {
      // given
      const media = Media.from(createMediaParams());

      // when & then
      expect(media.hasNoContent).toBe(true);
    });

    it('content가 있으면 false를 반환한다', () => {
      // given
      const media = Media.from(
        createMediaParams({
          content: {
            url: 'http://example.com/content.mp4',
            size: 10240,
            eTag: 'etag',
            mimeType: 'video/mp4',
            thumbnail: null,
          },
        }),
      );

      // when & then
      expect(media.hasNoContent).toBe(false);
    });
  });

  describe('hasNoThumbnail', () => {
    it('content가 없으면 true를 반환한다', () => {
      // given
      const media = Media.from(createMediaParams());

      // when & then
      expect(media.hasNoThumbnail).toBe(true);
    });

    it('content는 있지만 thumbnail이 없으면 true를 반환한다', () => {
      // given
      const media = Media.from(
        createMediaParams({
          content: {
            url: 'http://example.com/content.mp4',
            size: 10240,
            eTag: 'etag',
            mimeType: 'video/mp4',
            thumbnail: null,
          },
        }),
      );

      // when & then
      expect(media.hasNoThumbnail).toBe(true);
    });

    it('thumbnail이 있으면 false를 반환한다', () => {
      // given
      const media = Media.from(
        createMediaParams({
          content: {
            url: 'http://example.com/content.mp4',
            size: 10240,
            eTag: 'etag',
            mimeType: 'video/mp4',
            thumbnail: {
              url: 'http://example.com/thumb.png',
              size: 512,
              eTag: 'thumb-etag',
              mimeType: 'image/png',
              blurhash: 'LEHV6nWB',
            },
          },
        }),
      );

      // when & then
      expect(media.hasNoThumbnail).toBe(false);
    });
  });

  describe('hasThumbnail', () => {
    it('hasNoThumbnail의 반대 값을 반환한다', () => {
      // given
      const mediaWithoutThumbnail = Media.from(createMediaParams());
      const mediaWithThumbnail = Media.from(
        createMediaParams({
          content: {
            url: 'http://example.com/content.mp4',
            size: 10240,
            eTag: 'etag',
            mimeType: 'video/mp4',
            thumbnail: {
              url: 'http://example.com/thumb.png',
              size: 512,
              eTag: 'thumb-etag',
              mimeType: 'image/png',
              blurhash: 'LEHV6nWB',
            },
          },
        }),
      );

      // when & then
      expect(mediaWithoutThumbnail.hasThumbnail).toBe(false);
      expect(mediaWithThumbnail.hasThumbnail).toBe(true);
    });
  });

  describe('data', () => {
    it('객체 데이터를 반환한다', () => {
      // given
      const media = Media.from(createMediaParams());

      // when
      const data = media.data;

      // then
      expect(data.id).toBe(1);
      expect(data.cid).toBe('media-123');
      expect(data.albumId).toBe(1);
      expect(data.description).toBe('미디어 설명');
      expect(data.state).toBe('DRAFT');
      expect(data.version).toBe(1);
      expect(data.content).toBeNull();
      expect(data.isFavorite).toBe(false);
    });
  });
});
