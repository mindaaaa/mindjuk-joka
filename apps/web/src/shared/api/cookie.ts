/**
 * 브라우저 쿠키에서 특정 이름의 값을 추출한다.
 */
export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const target = `${name}=`;
  for (const segment of document.cookie.split('; ')) {
    if (segment.startsWith(target)) {
      return decodeURIComponent(segment.slice(target.length));
    }
  }
  return null;
}
