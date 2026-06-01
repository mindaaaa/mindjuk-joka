import { describe, expect, test } from 'vitest';

import { canUpload, canWriteMeta } from './access';

describe('access policy', () => {
  describe('canUpload', () => {
    test('ADMIN, EDITOR만 업로드할 수 있다', () => {
      expect(canUpload('ADMIN')).toBe(true);
      expect(canUpload('EDITOR')).toBe(true);
      expect(canUpload('VIEWER')).toBe(false);
      expect(canUpload(undefined)).toBe(false);
      expect(canUpload(null)).toBe(false);
    });
  });

  describe('canWriteMeta (수정·삭제 통합)', () => {
    test('ADMIN은 모든 사진 쓰기 가능', () => {
      expect(canWriteMeta('ADMIN', 'uploader-1', 'me')).toBe(true);
    });

    test('EDITOR는 본인 업로드만 쓰기 가능', () => {
      expect(canWriteMeta('EDITOR', 'me', 'me')).toBe(true);
      expect(canWriteMeta('EDITOR', 'other', 'me')).toBe(false);
    });

    test('VIEWER는 쓰기 불가', () => {
      expect(canWriteMeta('VIEWER', 'me', 'me')).toBe(false);
    });

    test('uploaderId 또는 userId가 없으면 EDITOR도 거부 (소유권 불명)', () => {
      expect(canWriteMeta('EDITOR', undefined, 'me')).toBe(false);
      expect(canWriteMeta('EDITOR', 'me', undefined)).toBe(false);
    });
  });
});
