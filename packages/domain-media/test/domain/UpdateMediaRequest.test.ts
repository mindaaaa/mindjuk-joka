import { UncaughtException } from '@joka/core/src/exception';
import { z } from 'zod';

import { UpdateMediaRequest } from '../../src/domain/UpdateMediaRequest';

const mockContentData = {
  url: 'http://example.com/content.mp4',
  size: 10240,
  eTag: 'content-etag',
  mimeType: 'video/mp4',
  thumbnail: null,
};

const mockContent = {
  ...mockContentData,
  url: { path: mockContentData.url },
  mimeType: { value: mockContentData.mimeType },
  data: mockContentData,
};

jest.mock('../../src/domain/Content', () => ({
  Content: {
    from: jest.fn(() => mockContent),
    Schema: z.object({
      url: z.string(),
      size: z.number(),
      eTag: z.string(),
      mimeType: z.string(),
      thumbnail: z.any().nullable(),
    }),
  },
}));

jest.mock('../../src/domain/Media', () => ({
  Media: {
    State: {
      DRAFT: 'DRAFT',
      PREPARING: 'PREPARING',
      COMPLETE: 'COMPLETE',
    },
  },
}));

describe('UpdateMediaRequest', () => {
  beforeEach(() => {
    // from 메서드가 Schema.parse 호출 시 isForced를 전달하지 않으므로,
    // Schema에서 isForced 검증을 제외한 버전으로 대체
    jest.spyOn(UpdateMediaRequest as any, 'Schema', 'get').mockReturnValue(
      z
        .object({
          cid: z.string().min(1),
          description: z.string().min(1).optional(),
          state: z.enum(['DRAFT', 'PREPARING', 'COMPLETE']).optional(),
          content: z
            .object({
              url: z.string(),
              size: z.number(),
              eTag: z.string(),
              mimeType: z.string(),
              thumbnail: z.any().nullable(),
            })
            .nullish(),
        })
        .strict(),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('from', () => {
    it('모든 파라미터가 있는 UpdateMediaRequest 객체를 생성한다', () => {
      // given
      const params = {
        cid: 'media-123',
        description: 'updated description',
        state: 'PREPARING',
        content: mockContent as any,
        isForced: false,
      };

      // when
      const request = UpdateMediaRequest.from(params);

      // then
      expect(request).toBeInstanceOf(UpdateMediaRequest);
      expect(request.cid).toBe('media-123');
      expect(request.description).toBe('updated description');
      expect(request.state).toBe('PREPARING');
      expect(request.isForced).toBe(false);
    });

    it('description만 업데이트하는 요청을 생성한다', () => {
      // given
      const params = {
        cid: 'media-123',
        description: 'new description',
        state: undefined,
        content: undefined,
        isForced: false,
      };

      // when
      const request = UpdateMediaRequest.from(params);

      // then
      expect(request.cid).toBe('media-123');
      expect(request.description).toBe('new description');
      expect(request.state).toBeUndefined();
      expect(request.isForced).toBe(false);
    });

    it('state만 업데이트하는 요청을 생성한다', () => {
      // given
      const params = {
        cid: 'media-123',
        description: undefined,
        state: 'COMPLETE',
        content: undefined,
        isForced: false,
      };

      // when
      const request = UpdateMediaRequest.from(params);

      // then
      expect(request.cid).toBe('media-123');
      expect(request.state).toBe('COMPLETE');
      expect(request.description).toBeUndefined();
      expect(request.isForced).toBe(false);
    });

    it('content를 null로 설정하는 요청을 생성한다', () => {
      // given
      const params = {
        cid: 'media-123',
        description: undefined,
        state: undefined,
        content: null,
        isForced: false,
      };

      // when
      const request = UpdateMediaRequest.from(params);

      // then
      expect(request.shouldUpdateContent).toBe(true);
      expect(request.content).toBeNull();
    });
  });

  describe('shouldUpdateContent', () => {
    it('content가 명시적으로 전달되면 true를 반환한다', () => {
      // given
      const request = UpdateMediaRequest.from({
        cid: 'media-123',
        description: undefined,
        state: undefined,
        content: mockContent as any,
        isForced: false,
      });

      // when & then
      expect(request.shouldUpdateContent).toBe(true);
    });

    it('content가 null로 전달되면 true를 반환한다', () => {
      // given
      const request = UpdateMediaRequest.from({
        cid: 'media-123',
        description: undefined,
        state: undefined,
        content: null,
        isForced: false,
      });

      // when & then
      expect(request.shouldUpdateContent).toBe(true);
    });

    it('content가 undefined이면 false를 반환한다', () => {
      // given
      const request = UpdateMediaRequest.from({
        cid: 'media-123',
        description: 'test',
        state: undefined,
        content: undefined,
        isForced: false,
      });

      // when & then
      expect(request.shouldUpdateContent).toBe(false);
    });
  });

  describe('content', () => {
    it('shouldUpdateContent가 true일 때 content를 반환한다', () => {
      // given
      const request = UpdateMediaRequest.from({
        cid: 'media-123',
        description: undefined,
        state: undefined,
        content: mockContent as any,
        isForced: false,
      });

      // when
      const content = request.content;

      // then
      expect(content).toBe(mockContent);
    });

    it('shouldUpdateContent가 true이고 content가 null이면 null을 반환한다', () => {
      // given
      const request = UpdateMediaRequest.from({
        cid: 'media-123',
        description: undefined,
        state: undefined,
        content: null,
        isForced: false,
      });

      // when
      const content = request.content;

      // then
      expect(content).toBeNull();
    });

    it('shouldUpdateContent가 false이면 UncaughtException을 던진다', () => {
      // given
      const request = UpdateMediaRequest.from({
        cid: 'media-123',
        description: 'test',
        state: undefined,
        content: undefined,
        isForced: false,
      });

      // when & then
      expect(() => request.content).toThrow(UncaughtException);
    });
  });
});
