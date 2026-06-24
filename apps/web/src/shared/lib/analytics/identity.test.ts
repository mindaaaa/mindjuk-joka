import { beforeEach, describe, expect, test } from 'vitest';

import {
  getAnonUserId,
  getSessionId,
  getUserRole,
  routePattern,
  setAnalyticsUser,
  setRoleResolver,
} from './identity';

beforeEach(async () => {
  sessionStorage.clear();
  await setAnalyticsUser(null);
  setRoleResolver(() => null);
});

describe('getSessionId', () => {
  test('처음 호출 시 생성하고 sessionStorage에 보관', () => {
    const id = getSessionId();
    expect(id).toBeTruthy();
    expect(sessionStorage.getItem('joka.sid')).toBe(id);
  });

  test('같은 세션에서 동일 값 반환', () => {
    expect(getSessionId()).toBe(getSessionId());
  });
});

describe('setAnalyticsUser / anonUserId', () => {
  test('userId를 16자 해시로 변환 (원본 노출 X)', async () => {
    await setAnalyticsUser('user-123');
    const hash = getAnonUserId();

    expect(hash).toHaveLength(16);
    expect(hash).not.toBe('user-123');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  test('같은 userId는 같은 해시 (결정적)', async () => {
    await setAnalyticsUser('user-123');
    const first = getAnonUserId();
    await setAnalyticsUser('user-123');
    expect(getAnonUserId()).toBe(first);
  });

  test('null이면 anonUserId 초기화', async () => {
    await setAnalyticsUser('user-123');
    await setAnalyticsUser(null);
    expect(getAnonUserId()).toBeNull();
  });
});

describe('setRoleResolver / userRole', () => {
  test('resolver가 emit 시점의 현재 앨범 role을 반환', () => {
    let current: string | null = 'EDITOR';
    setRoleResolver(() => current as never);

    expect(getUserRole()).toBe('EDITOR');

    current = 'VIEWER';
    expect(getUserRole()).toBe('VIEWER');
  });

  test('미주입(기본) 시 null', () => {
    expect(getUserRole()).toBeNull();
  });
});

describe('routePattern', () => {
  test('사진 상세는 :id로 정규화', () => {
    expect(routePattern('/photos/abc123')).toBe('/photos/:id');
  });

  test('목록·정적 경로는 그대로', () => {
    expect(routePattern('/photos')).toBe('/photos');
    expect(routePattern('/login')).toBe('/login');
    expect(routePattern('/upload')).toBe('/upload');
  });

  test('중첩 경로는 정규화하지 않음', () => {
    expect(routePattern('/photos/abc/edit')).toBe('/photos/abc/edit');
  });
});
