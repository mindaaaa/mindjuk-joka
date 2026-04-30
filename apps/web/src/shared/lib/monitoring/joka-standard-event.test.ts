import { describe, expect, test } from 'vitest';

import { attachJokaStandardContext } from './joka-standard-event';

interface MutableEvent {
  tags?: Record<string, unknown>;
  message?: unknown;
  fingerprint?: string[];
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: {
        frames?: Array<{
          function?: string;
          filename?: string;
          lineno?: number;
        }>;
      };
    }>;
  };
  contexts?: Record<string, unknown>;
}

function getJokaStandard(event: MutableEvent): Record<string, unknown> {
  return event.contexts?.joka_standard as Record<string, unknown>;
}

describe('attachJokaStandardContext', () => {
  test('attachJokaStandardContext는 태그가 비어 있는 상황에서 unknown 기본값으로 컨텍스트를 부착할 수 있다', () => {
    const event: MutableEvent = {};

    attachJokaStandardContext(event);

    expect(getJokaStandard(event)).toMatchObject({
      layer: 'unknown',
      operationId: 'unknown',
      mediaState: 'unknown',
      userRole: 'unknown',
    });
  });

  test('attachJokaStandardContext는 태그 4종(layer/operationId/mediaState/userRole)을 그대로 컨텍스트로 옮길 수 있다', () => {
    const event: MutableEvent = {
      tags: {
        layer: 'bug',
        operationId: 'createUploadUrls',
        mediaState: 'COMPLETE',
        userRole: 'EDITOR',
      },
    };

    attachJokaStandardContext(event);

    expect(getJokaStandard(event)).toMatchObject({
      layer: 'bug',
      operationId: 'createUploadUrls',
      mediaState: 'COMPLETE',
      userRole: 'EDITOR',
    });
  });

  test('attachJokaStandardContext는 bug 계층인 상황에서 stack 필드를 포함한 컨텍스트를 뱉는다', () => {
    const event: MutableEvent = {
      tags: { layer: 'bug' },
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'cannot read x',
            stacktrace: {
              frames: [
                { function: 'inner', filename: 'app.ts', lineno: 3 },
                { function: 'outer', filename: 'app.ts', lineno: 10 },
              ],
            },
          },
        ],
      },
    };

    attachJokaStandardContext(event);

    const stack = getJokaStandard(event).stack as string;
    expect(stack).toContain('TypeError: cannot read x');
    expect(stack).toContain('outer');
    expect(stack).toContain('inner');
  });

  test('attachJokaStandardContext는 bug 외 계층인 상황에서 stack 필드를 뱉지 않는다', () => {
    const event: MutableEvent = { tags: { layer: 'operational' } };

    attachJokaStandardContext(event);

    expect(getJokaStandard(event).stack).toBeUndefined();
  });

  test('attachJokaStandardContext는 fingerprint가 비어 있는 상황에서 [operationId, mediaState]로 자동 채울 수 있다', () => {
    const event: MutableEvent = {
      tags: {
        layer: 'bug',
        operationId: 'createUploadUrls',
        mediaState: 'PREPARING',
      },
    };

    attachJokaStandardContext(event);

    expect(getJokaStandard(event).fingerprint).toEqual([
      'createUploadUrls',
      'PREPARING',
    ]);
  });

  test('attachJokaStandardContext는 fingerprint가 이미 있는 상황에서 그 값을 그대로 유지한다', () => {
    const event: MutableEvent = {
      tags: { layer: 'bug' },
      fingerprint: ['custom-key'],
    };

    attachJokaStandardContext(event);

    expect(getJokaStandard(event).fingerprint).toEqual(['custom-key']);
  });

  test('attachJokaStandardContext는 contexts.payload.standardMessage가 있는 상황에서 그것을 표준 메시지로 채택한다', () => {
    const event: MutableEvent = {
      tags: { layer: 'bug' },
      message: 'fallback-message',
      contexts: {
        payload: { standardMessage: 'BUG|state_violation|confirm_on_complete' },
      },
    };

    attachJokaStandardContext(event);

    expect(getJokaStandard(event).message).toBe(
      'BUG|state_violation|confirm_on_complete',
    );
  });

  test('attachJokaStandardContext는 standardMessage가 없는 상황에서 event.message를 표준 메시지로 채택한다', () => {
    const event: MutableEvent = {
      tags: { layer: 'operational' },
      message: 'OP|upload|confirm_failed',
    };

    attachJokaStandardContext(event);

    expect(getJokaStandard(event).message).toBe('OP|upload|confirm_failed');
  });

  test('attachJokaStandardContext는 message가 비어 있는 상황에서 예외 요약(타입: 메시지)을 표준 메시지로 뱉는다', () => {
    const event: MutableEvent = {
      tags: { layer: 'bug' },
      exception: { values: [{ type: 'TypeError', value: 'cannot read x' }] },
    };

    attachJokaStandardContext(event);

    expect(getJokaStandard(event).message).toBe('TypeError: cannot read x');
  });

  test('attachJokaStandardContext는 기존 contexts를 유지한 채 joka_standard만 추가할 수 있다', () => {
    const event: MutableEvent = {
      tags: { layer: 'bug' },
      contexts: { existing: { foo: 'bar' } },
    };

    attachJokaStandardContext(event);

    expect(event.contexts?.existing).toEqual({ foo: 'bar' });
    expect(getJokaStandard(event)).toBeDefined();
  });
});
