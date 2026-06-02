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
 * ISO 8601 문자열을 한국어(ko-KR) 날짜·시각 표기로 변환한다.
 *
 * - 날짜는 medium(예: `2026. 1. 1.`), 시각은 short(예: `오후 3:00`) 스타일을 쓴다.
 * - 파싱할 수 없는 입력이면 원본 문자열을 그대로 반환한다.
 *
 * @example
 * formatDateTime('2026-01-01T15:00:00.000Z'); // '2026. 1. 1. 오후 3:00' (KST 기준)
 * formatDateTime('not-a-date');               // 'not-a-date'
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
