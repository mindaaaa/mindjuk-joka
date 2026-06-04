const KB = 1024;
const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

const roundToTenth = (n: number) => Math.round(n * 10) / 10;

/**
 * 바이트 크기를 사람이 읽기 쉬운 단위 문자열로 변환한다.
 *
 * - 1024를 기준으로 B → KB → MB → GB까지 환산하며, GB를 상한으로 둔다.
 *
 * @example
 * formatBytes(1023);    // '1023B'
 * formatBytes(1024);    // '1KB'
 * formatBytes(1536);    // '1.5KB'
 * formatBytes(0);       // '-'
 * formatBytes(undefined); // '-'
 */
export function formatBytes(size: number | undefined): string {
  if (size == null || !Number.isFinite(size) || size <= 0) return '-';

  const exponent = Math.floor(Math.log(size) / Math.log(KB));
  const unitIndex = Math.min(exponent, UNITS.length - 1);
  const value = size / KB ** unitIndex;

  return `${unitIndex === 0 ? value : roundToTenth(value)}${UNITS[unitIndex]}`;
}

/**
 * ISO 8601 문자열을 날짜·시각 표기로 변환한다.
 *
 * - 표기 언어·형식은 `locale`을 따른다. 생략하면 실행 환경(브라우저)의 기본 로케일을 쓴다.
 * - 타임존은 지정하지 않으므로 실행 환경(브라우저)의 타임존을 따른다.
 *   (서버가 UTC로 내려준 시각이 보는 사람의 현지 시각으로 표시된다)
 * - 날짜는 medium, 시각은 short 스타일을 쓴다.
 * - 파싱할 수 없는 입력이면 원본 문자열을 그대로 반환한다.
 *
 * @example
 * // 브라우저가 ko-KR / Asia/Seoul 인 경우 (06:00Z == 15:00 KST)
 * formatDateTime('2026-01-01T06:00:00.000Z');          // '2026. 1. 1. 오후 3:00'
 * // 로케일을 명시하면 그 언어로 (타임존은 여전히 브라우저 기준)
 * formatDateTime('2026-01-01T06:00:00.000Z', 'en-US'); // 'Jan 1, 2026, 3:00 PM'
 * formatDateTime('not-a-date');                        // 'not-a-date'
 */
export function formatDateTime(
  iso: string,
  locale?: string, // 생략 시 브라우저 기본 로케일
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
