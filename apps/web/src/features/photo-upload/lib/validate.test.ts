import { describe, expect, test } from 'vitest';

import { MAX_FILE_SIZE, WARN_FILE_SIZE, validateFile } from './validate';

function makeFile(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('validateFile', () => {
  describe('허용 형식', () => {
    test('이미지 MIME 통과 (jpeg/png/webp/heic/heif)', () => {
      expect(validateFile(makeFile('a.jpg', 'image/jpeg', 1024)).ok).toBe(true);
      expect(validateFile(makeFile('a.png', 'image/png', 1024)).ok).toBe(true);
      expect(validateFile(makeFile('a.webp', 'image/webp', 1024)).ok).toBe(
        true,
      );
      expect(validateFile(makeFile('a.heic', 'image/heic', 1024)).ok).toBe(
        true,
      );
      expect(validateFile(makeFile('a.heif', 'image/heif', 1024)).ok).toBe(
        true,
      );
    });

    test('영상 MIME 통과 (mp4/quicktime)', () => {
      expect(validateFile(makeFile('a.mp4', 'video/mp4', 1024)).ok).toBe(true);
      expect(validateFile(makeFile('a.mov', 'video/quicktime', 1024)).ok).toBe(
        true,
      );
    });
  });

  describe('확장자 폴백 (file.type이 비어 들어오는 케이스)', () => {
    test('빈 MIME이어도 허용 확장자면 통과 (iOS HEIC)', () => {
      expect(validateFile(makeFile('IMG_0001.heic', '', 1024)).ok).toBe(true);
    });

    test('빈 MIME이어도 허용 영상 확장자면 통과 (.mov)', () => {
      expect(validateFile(makeFile('clip.mov', '', 1024)).ok).toBe(true);
    });

    test('확장자 대소문자 무시', () => {
      expect(validateFile(makeFile('A.JPG', '', 1024)).ok).toBe(true);
    });
  });

  describe('거부 형식', () => {
    test('빈 MIME + 허용되지 않는 확장자 거부', () => {
      const result = validateFile(makeFile('a.bin', '', 1024));
      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.reason).toBe('mime');
      }
    });

    test('허용되지 않는 MIME 거부 (gif)', () => {
      const result = validateFile(makeFile('a.gif', 'image/gif', 1024));
      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.reason).toBe('mime');
      }
    });

    test('확장자도 없는 파일 거부', () => {
      const result = validateFile(makeFile('noext', '', 1024));
      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.reason).toBe('mime');
        expect(result.message).toContain('알 수 없음');
      }
    });
  });

  describe('크기 정책', () => {
    test('최대 크기 경계(50MB)는 통과', () => {
      expect(
        validateFile(makeFile('big.jpg', 'image/jpeg', MAX_FILE_SIZE)).ok,
      ).toBe(true);
    });

    test('최대 크기 초과 거부', () => {
      const result = validateFile(
        makeFile('big.jpg', 'image/jpeg', MAX_FILE_SIZE + 1),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('size');
      }
    });

    test('경고 경계(20MB) 이상이면 통과하되 warning 포함', () => {
      const result = validateFile(
        makeFile('mid.jpg', 'image/jpeg', WARN_FILE_SIZE),
      );
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.warning).toBeDefined();
      }
    });

    test('경고 경계 미만이면 warning 없음', () => {
      const result = validateFile(
        makeFile('small.jpg', 'image/jpeg', WARN_FILE_SIZE - 1),
      );
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.warning).toBeUndefined();
      }
    });
  });
});
