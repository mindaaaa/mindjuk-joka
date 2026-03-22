import {
  zMediaState,
  zError,
  zMedia,
  zUser,
  zActioned,
  zContent,
  zLocation,
  zThumbnail,
  zRole,
  zCreateMedia,
  zUpdateMedia,
  zCreateContent,
  zListMediaResponse,
} from '../src';

describe('Zod schemas', () => {
  describe('zMediaState', () => {
    it.each(['DRAFT', 'PREPARING', 'COMPLETE'])(
      'should accept "%s"',
      (value) => {
        expect(zMediaState.parse(value)).toBe(value);
      },
    );

    it('should reject invalid value', () => {
      expect(() => zMediaState.parse('INVALID')).toThrow();
    });
  });

  describe('zRole', () => {
    it.each(['ADMIN', 'EDITOR', 'VIEWER'])('should accept "%s"', (value) => {
      expect(zRole.parse(value)).toBe(value);
    });

    it('should reject invalid value', () => {
      expect(() => zRole.parse('GUEST')).toThrow();
    });
  });

  describe('zUser', () => {
    it('should accept valid user', () => {
      const user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
      expect(zUser.parse(user)).toEqual(user);
    });

    it('should reject user without required fields', () => {
      expect(() => zUser.parse({ id: 'user-1' })).toThrow();
    });
  });

  describe('zLocation', () => {
    it('should accept valid location', () => {
      const location = {
        url: 'https://storage.example.com/file.png',
        accessUrl: 'https://cdn.example.com/file.png',
      };
      expect(zLocation.parse(location)).toEqual(location);
    });
  });

  describe('zThumbnail', () => {
    it('should accept valid thumbnail', () => {
      const thumbnail = {
        location: {
          url: 'https://storage.example.com/thumb.jpg',
          accessUrl: 'https://cdn.example.com/thumb.jpg',
        },
        size: BigInt(1024),
        eTag: '"abc123"',
        mimeType: 'image/jpeg',
        blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      };
      expect(zThumbnail.parse(thumbnail)).toEqual(thumbnail);
    });
  });

  describe('zContent', () => {
    it('should accept valid content without thumbnail', () => {
      const content = {
        location: {
          url: 'https://storage.example.com/file.png',
          accessUrl: 'https://cdn.example.com/file.png',
        },
        size: BigInt(2048),
        eTag: '"def456"',
        mimeType: 'image/png',
      };
      expect(zContent.parse(content)).toEqual(content);
    });

    it('should accept valid content with thumbnail', () => {
      const content = {
        location: {
          url: 'https://storage.example.com/file.png',
          accessUrl: 'https://cdn.example.com/file.png',
        },
        size: BigInt(2048),
        eTag: '"def456"',
        mimeType: 'image/png',
        thumbnail: {
          location: {
            url: 'https://storage.example.com/thumb.jpg',
            accessUrl: 'https://cdn.example.com/thumb.jpg',
          },
          size: BigInt(512),
          eTag: '"ghi789"',
          mimeType: 'image/jpeg',
          blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        },
      };
      expect(zContent.parse(content)).toEqual(content);
    });
  });

  describe('zActioned', () => {
    it('should accept valid actioned', () => {
      const actioned = {
        at: '2025-01-01T00:00:00Z',
        by: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
      };
      expect(zActioned.parse(actioned)).toEqual(actioned);
    });
  });

  describe('zMedia', () => {
    const validMedia = {
      id: 'media-1',
      description: 'A test media',
      state: 'DRAFT' as const,
      isFavorite: false,
      created: {
        at: '2025-01-01T00:00:00Z',
        by: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
      },
    };

    it('should accept valid media without content', () => {
      expect(zMedia.parse(validMedia)).toEqual(validMedia);
    });

    it('should accept valid media with content', () => {
      const media = {
        ...validMedia,
        content: {
          location: {
            url: 'https://storage.example.com/file.png',
            accessUrl: 'https://cdn.example.com/file.png',
          },
          size: BigInt(2048),
          eTag: '"abc"',
          mimeType: 'image/png',
        },
      };
      expect(zMedia.parse(media)).toEqual(media);
    });

    it('should reject media without required fields', () => {
      expect(() => zMedia.parse({ id: 'media-1' })).toThrow();
    });
  });

  describe('zError', () => {
    it('should accept valid error', () => {
      const error = {
        traceId: '550e8400-e29b-41d4-a716-446655440000',
        path: '/api/v1/media/xxx',
        status: 404,
        code: 'MEDIA_NOT_FOUND',
        messages: ['Media(xxx)가 존재하지 않습니다.'],
        timestamp: '2025-01-01T00:00:00Z',
      };
      expect(zError.parse(error)).toEqual(error);
    });

    it('should reject error with status out of range', () => {
      const error = {
        traceId: '550e8400-e29b-41d4-a716-446655440000',
        path: '/api/v1/media/xxx',
        status: 200,
        code: 'OK',
        messages: ['ok'],
        timestamp: '2025-01-01T00:00:00Z',
      };
      expect(() => zError.parse(error)).toThrow();
    });
  });

  describe('zCreateMedia', () => {
    it('should accept valid create media request', () => {
      const body = { description: 'New media' };
      expect(zCreateMedia.parse(body)).toEqual(body);
    });

    it('should reject empty description', () => {
      expect(() => zCreateMedia.parse({ description: '' })).toThrow();
    });
  });

  describe('zUpdateMedia', () => {
    it('should accept valid update media request', () => {
      const body = { description: 'Updated' };
      expect(zUpdateMedia.parse(body)).toEqual(body);
    });

    it('should accept empty object (all fields optional)', () => {
      expect(zUpdateMedia.parse({})).toEqual({});
    });
  });

  describe('zCreateContent', () => {
    it('should accept valid create content request', () => {
      const body = { url: 'https://example.com/file.png' };
      expect(zCreateContent.parse(body)).toEqual(body);
    });

    it('should reject invalid URL', () => {
      expect(() => zCreateContent.parse({ url: 'not-a-url' })).toThrow();
    });
  });

  describe('zListMediaResponse', () => {
    it('should accept valid list media response', () => {
      const response = {
        items: [
          {
            id: 'media-1',
            description: 'A test media',
            state: 'DRAFT' as const,
            isFavorite: false,
            created: {
              at: '2025-01-01T00:00:00Z',
              by: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
            },
          },
        ],
        pagination: {
          size: 20,
          sortBy: 'CREATED_AT' as const,
          order: 'DESC' as const,
          nextCursor: 'cursor-abc',
          hasNext: true,
        },
      };
      expect(zListMediaResponse.parse(response)).toEqual(response);
    });
  });
});
