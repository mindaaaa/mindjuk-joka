import { describe, expect, test } from 'vitest';

import { canDelete, canEditMeta, canUpload } from './access';

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

  describe('canEditMeta / canDelete', () => {
    test('ADMIN은 모든 사진 편집/삭제 가능', () => {
      expect(canEditMeta('ADMIN', 'uploader-1', 'me')).toBe(true);
      expect(canDelete('ADMIN', 'uploader-1', 'me')).toBe(true);
    });

    test('EDITOR는 본인 업로드만 편집/삭제 가능', () => {
      expect(canEditMeta('EDITOR', 'me', 'me')).toBe(true);
      expect(canEditMeta('EDITOR', 'other', 'me')).toBe(false);
      expect(canDelete('EDITOR', 'me', 'me')).toBe(true);
      expect(canDelete('EDITOR', 'other', 'me')).toBe(false);
    });

    test('VIEWER는 편집/삭제 불가', () => {
      expect(canEditMeta('VIEWER', 'me', 'me')).toBe(false);
      expect(canDelete('VIEWER', 'me', 'me')).toBe(false);
    });

    test('uploaderId 또는 userId가 없으면 EDITOR도 거부 (소유권 불명)', () => {
      expect(canEditMeta('EDITOR', undefined, 'me')).toBe(false);
      expect(canEditMeta('EDITOR', 'me', undefined)).toBe(false);
    });
  });
});
