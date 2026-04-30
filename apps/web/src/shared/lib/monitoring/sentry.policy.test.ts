import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { applyBeforeSendFilter } from './sentry.policy';
import type { SentryEventLike } from './sentry.policy';

describe('applyBeforeSendFilter', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    randomSpy = vi.spyOn(Math, 'random');
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  test('applyBeforeSendFilter는 expected 계층 이벤트를 null로 drop할 수 있다', () => {
    const event: SentryEventLike = { tags: { layer: 'expected' } };

    expect(applyBeforeSendFilter(event)).toBeNull();
  });

  test('applyBeforeSendFilter는 business 계층이 샘플링 임계치를 넘는 상황에서 null을 뱉는다', () => {
    randomSpy.mockReturnValue(0.5);
    const event: SentryEventLike = { tags: { layer: 'business' } };

    expect(applyBeforeSendFilter(event)).toBeNull();
  });

  test('applyBeforeSendFilter는 business 계층이 샘플링에 당첨된 상황에서 이벤트를 그대로 통과시킨다', () => {
    randomSpy.mockReturnValue(0.05);
    const event: SentryEventLike = {
      tags: { layer: 'business', operationId: 'listMedia', mediaState: 'COMPLETE' },
    };

    expect(applyBeforeSendFilter(event)).toBe(event);
  });

  test('applyBeforeSendFilter는 operational 계층이 allowlist 메시지인 상황에서 이벤트를 통과시킨다', () => {
    const event: SentryEventLike = {
      tags: { layer: 'operational' },
      message: 'OP|upload|confirm_failed',
    };

    expect(applyBeforeSendFilter(event)).toBe(event);
  });

  test('applyBeforeSendFilter는 operational 계층이 allowlist 밖 메시지인 상황에서 null을 뱉는다', () => {
    const event: SentryEventLike = {
      tags: { layer: 'operational' },
      message: 'OP|something|unknown',
    };

    expect(applyBeforeSendFilter(event)).toBeNull();
  });

  test('applyBeforeSendFilter는 operational 메시지가 formatted 객체 형태여도 allowlist 검사를 할 수 있다', () => {
    const event = {
      tags: { layer: 'operational' },
      message: { formatted: 'OP|upload|not_completed' },
    } as unknown as SentryEventLike;

    expect(applyBeforeSendFilter(event)).toBe(event);
  });

  test('applyBeforeSendFilter는 bug 계층 이벤트를 무조건 통과시킬 수 있다', () => {
    const event: SentryEventLike = { tags: { layer: 'bug' } };

    expect(applyBeforeSendFilter(event)).toBe(event);
  });

  test('applyBeforeSendFilter는 통과 이벤트에 [operationId, mediaState] fingerprint를 자동으로 부여한다', () => {
    const event: SentryEventLike = {
      tags: { layer: 'bug', operationId: 'createUploadUrls', mediaState: 'COMPLETE' },
    };

    const result = applyBeforeSendFilter(event);

    expect(result?.fingerprint).toEqual(['createUploadUrls', 'COMPLETE']);
  });

  test('applyBeforeSendFilter는 operationId/mediaState 중 하나만 있는 상황에서도 fingerprint를 만들 수 있다', () => {
    const event: SentryEventLike = {
      tags: { layer: 'bug', operationId: 'updateMedia' },
    };

    const result = applyBeforeSendFilter(event);

    expect(result?.fingerprint).toEqual(['updateMedia']);
  });

  test('applyBeforeSendFilter는 통과 이벤트에 joka_standard 컨텍스트를 부착할 수 있다', () => {
    const event = {
      tags: {
        layer: 'bug',
        operationId: 'createUploadUrls',
        mediaState: 'PREPARING',
        userRole: 'EDITOR',
      },
      message: 'BUG|state_violation|confirm_on_complete',
    } as SentryEventLike & { contexts?: Record<string, unknown> };

    const result = applyBeforeSendFilter(event) as typeof event;

    expect(result.contexts?.joka_standard).toMatchObject({
      layer: 'bug',
      operationId: 'createUploadUrls',
      mediaState: 'PREPARING',
      userRole: 'EDITOR',
      message: 'BUG|state_violation|confirm_on_complete',
    });
  });

  test('applyBeforeSendFilter는 태그가 비어 있는 상황에서 unknown 기본값으로 normalize한 뒤 이벤트를 통과시킨다', () => {
    const event: SentryEventLike = { tags: { layer: 'bug' } };

    const result = applyBeforeSendFilter(event);

    expect(result?.tags).toMatchObject({
      layer: 'bug',
      operationId: 'unknown',
      mediaState: 'unknown',
      userRole: 'unknown',
    });
  });
});
