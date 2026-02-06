import { Url } from '../../src/model/Url';

describe('Url', () => {
  describe('from', () => {
    it('유효한 http URL로 Url 객체를 생성한다', () => {
      // given
      // when
      const url = Url.from('http://example.com');

      // then
      expect(url).toBeInstanceOf(Url);
      expect(url.fullPath).toBe('http://example.com/');
    });

    it('유효한 https URL로 Url 객체를 생성한다', () => {
      // given
      // when
      const url = Url.from('https://example.com');

      // then
      expect(url).toBeInstanceOf(Url);
      expect(url.fullPath).toBe('https://example.com/');
    });

    it('다양한 유효한 URL 형식을 처리한다', () => {
      // given
      const validUrls = [
        'http://localhost:3000',
        'https://example.com/path',
        'https://example.com/path?query=value',
        'https://sub.example.com/path#fragment',
      ];

      // when
      // then
      validUrls.forEach((urlStr) => {
        const url = Url.from(urlStr);
        expect(url.fullPath).toBeTruthy();
      });
    });

    it('빈 문자열인 경우 에러를 던진다', () => {
      // given
      // when
      // then
      expect(() => Url.from('')).toThrow();
      expect(() => Url.from('   ')).toThrow();
    });

    it('http/https가 아닌 프로토콜은 에러를 던진다', () => {
      // given
      // when
      // then
      expect(() => Url.from('ftp://example.com')).toThrow();
      expect(() => Url.from('file:///path/to/file')).toThrow();
    });

    it('유효하지 않은 URL 형식인 경우 에러를 던진다', () => {
      // given
      // when
      // then
      expect(() => Url.from('not-a-url')).toThrow();
      expect(() => Url.from('example.com')).toThrow();
    });

    it('문자열이 아닌 값이 전달되면 에러를 던진다', () => {
      // given
      // when
      // then
      expect(() => Url.from(123)).toThrow();
      expect(() => Url.from(null)).toThrow();
      expect(() => Url.from(undefined)).toThrow();
    });
  });

  describe('fullPath', () => {
    it('URL의 전체 경로를 반환한다', () => {
      // given
      const url = Url.from('https://example.com/path?query=value');

      // when
      // then
      expect(url.fullPath).toBe('https://example.com/path?query=value');
    });
  });

  describe('getPath', () => {
    it('URL의 path를 반환한다', () => {
      // given
      const url = Url.from('https://example.com/path?query=value');

      // when
      // then
      expect(url.getPath()).toBe('/path');
    });

    it('options가 누락되어도 path를 반환한다', () => {
      // given
      const url = Url.from('https://example.com/path?query=value');

      // when
      // then
      expect(url.getPath()).toBe('/path');
    });

    it('withoutBeginningSlash가 true인 경우 /로 시작하지 않는 path를 반환한다', () => {
      // given
      const url = Url.from('https://example.com/path?query=value');

      // when
      // then
      expect(url.getPath({ withoutBeginningSlash: true })).toBe('path');
    });

    it('withoutBeginningSlash가 false인 경우 /로 시작하는 path를 반환한다', () => {
      // given
      const url = Url.from('https://example.com/path?query=value');

      // when
      // then
      expect(url.getPath({ withoutBeginningSlash: false })).toBe('/path');
    });
  });
});
