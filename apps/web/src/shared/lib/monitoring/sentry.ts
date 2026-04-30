import * as Sentry from '@sentry/react';

import { applyBeforeSendFilter } from './sentry.policy';

type SentryBeforeSend = NonNullable<
  Parameters<typeof Sentry.init>[0]['beforeSend']
>;
type SentryEvent = Parameters<SentryBeforeSend>[0];

/**
 * Sentry 초기화 & beforeSend 연동.
 * 앱 진입(app/providers)에서 1회만 호출.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  Sentry.init({
    dsn: dsn ?? undefined,
    sendDefaultPii: true,
    beforeSend(event: SentryEvent) {
      return applyBeforeSendFilter(event);
    },
  });
}
