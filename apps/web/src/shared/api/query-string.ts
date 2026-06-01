type QueryPrimitive = string | number;
type QueryValue = QueryPrimitive | QueryPrimitive[] | undefined;

/**
 * 객체를 쿼리스트링으로 직렬화한다.
 *   - undefined/빈 문자열 값은 생략한다
 *   - 배열은 같은 key를 반복해 펼친다 (states=A&states=B)
 *   - 결과가 비면 빈 문자열, 아니면 선행 `?`를 붙여 반환한다
 */
export function buildQuery(params: Record<string, QueryValue>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === '') continue;
        searchParams.append(key, String(item));
      }

      continue;
    }

    if (value === '') continue;
    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
