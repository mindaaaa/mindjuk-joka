import { MimeType } from '../../src/domain/MimeType';

jest.mock('mime-types', () => ({
  extension: jest.fn((mimeType: string) => {
    const validTypes: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpeg',
      'video/mp4': 'mp4',
      'audio/mpeg': 'mp3',
    };
    return validTypes[mimeType] || false;
  }),
}));

describe('MimeType', () => {
  describe('from', () => {
    it('유효한 MIME 타입으로 MimeType 객체를 생성한다', () => {
      // given
      const value = 'image/png';

      // when
      const mimeType = MimeType.from(value);

      // then
      expect(mimeType).toBeInstanceOf(MimeType);
      expect(mimeType.type).toBe('image');
      expect(mimeType.subType).toBe('png');
    });

    it('다양한 유효한 MIME 타입을 처리한다', () => {
      // given
      const testCases = [
        { value: 'image/jpeg', expectedType: 'image', expectedSubType: 'jpeg' },
        { value: 'video/mp4', expectedType: 'video', expectedSubType: 'mp4' },
        { value: 'audio/mpeg', expectedType: 'audio', expectedSubType: 'mpeg' },
      ];

      // when & then
      testCases.forEach(({ value, expectedType, expectedSubType }) => {
        const mimeType = MimeType.from(value);
        expect(mimeType.type).toBe(expectedType);
        expect(mimeType.subType).toBe(expectedSubType);
      });
    });

    it('유효하지 않은 MIME 타입 형식이면 에러를 던진다', () => {
      // given
      const invalidFormats = [
        'invalid',
        'image',
        'image/',
        '/png',
        'image//png',
        '',
      ];

      // when & then
      invalidFormats.forEach((value) => {
        expect(() => MimeType.from(value)).toThrow();
      });
    });

    it('mime-types 라이브러리에서 인식하지 못하는 타입이면 에러를 던진다', () => {
      // given
      const unknownType = 'image/unknown';

      // when & then
      expect(() => MimeType.from(unknownType)).toThrow();
    });

    it('문자열이 아닌 값이 전달되면 에러를 던진다', () => {
      // given
      const invalidValues = [123, null, undefined, {}, []];

      // when & then
      invalidValues.forEach((value) => {
        expect(() => MimeType.from(value)).toThrow();
      });
    });
  });

  describe('value', () => {
    it('type과 subType을 슬래시로 합친 값을 반환한다', () => {
      // given
      const mimeType = MimeType.from('image/png');

      // when
      const result = mimeType.value;

      // then
      expect(result).toBe('image/png');
    });
  });
});