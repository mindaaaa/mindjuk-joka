import {
  BaseException,
  InvalidArgumentException,
  IllegalStateException,
  NotFoundException,
  UnauthorizedException,
  UncaughtException,
  ForbiddenException,
  ConflictException,
  NotImplementedException,
} from '../../src/exception';

describe('Exception', () => {
  describe('InvalidArgumentException', () => {
    it('instanceof 체크에 통과한다', () => {
      // given
      const fun = () => {
        throw new InvalidArgumentException();
      };

      // when
      // then
      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(InvalidArgumentException);
    });
  });

  describe('IllegalStateException', () => {
    it('instanceof 체크에 통과한다', () => {
      // given
      const fun = () => {
        throw new IllegalStateException();
      };

      // when
      // then
      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(IllegalStateException);
    });
  });

  describe('NotFoundException', () => {
    it('instanceof 체크에 통과한다', () => {
      // given
      const fun = () => {
        throw new NotFoundException();
      };

      // when
      // then
      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(NotFoundException);
    });
  });

  describe('UncaughtException', () => {
    it('instanceof 체크에 통과한다', () => {
      // given
      const fun = () => {
        throw new UncaughtException();
      };

      // when
      // then
      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(UncaughtException);
    });
  });

  describe('UnauthorizedException', () => {
    it('instanceof 체크에 통과한다', () => {
      // given
      const fun = () => {
        throw new UnauthorizedException();
      };

      // when
      // then
      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(UnauthorizedException);
    });
  });

  describe('ForbiddenException', () => {
    it('instanceof 체크에 통과한다', () => {
      // given
      const fun = () => {
        throw new ForbiddenException();
      };

      // when
      // then
      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(ForbiddenException);
    });
  });

  describe('ConflictException', () => {
    it('instanceof 체크에 통과한다', () => {
      // given
      const fun = () => {
        throw new ConflictException();
      };

      // when
      // then
      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(ConflictException);
    });
  });

  describe('NotImplementedException', () => {
    it('instanceof 체크에 통과한다', () => {
      // given
      const fun = () => {
        throw new NotImplementedException();
      };

      // when
      // then
      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(NotImplementedException);
    });
  });
});
