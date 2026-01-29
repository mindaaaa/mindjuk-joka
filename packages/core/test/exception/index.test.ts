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
} from "../../src/exception";

describe("Exception", () => {
  describe("InvalidArgumentException", () => {
    it("instanceof 체크에 통과한다", () => {
      const fun = () => {
        throw new InvalidArgumentException();
      }

      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(InvalidArgumentException);
    });
  });

  describe("IllegalStateException", () => {
    it("instanceof 체크에 통과한다", () => {
      const fun = () => {
        throw new IllegalStateException();
      }

      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(IllegalStateException);
    });
  });

  describe("NotFoundException", () => {
    it("instanceof 체크에 통과한다", () => {
      const fun = () => {
        throw new NotFoundException();
      }

      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(NotFoundException);
    });
  });

  describe("UncaughtException", () => {
    it("instanceof 체크에 통과한다", () => {
      const fun = () => {
        throw new UncaughtException();
      }

      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(UncaughtException);
    });
  });

  describe("UnauthorizedException", () => {
    it("instanceof 체크에 통과한다", () => {
      const fun = () => {
        throw new UnauthorizedException();
      }

      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(UnauthorizedException);
    });
  });

  describe("ForbiddenException", () => {
    it("instanceof 체크에 통과한다", () => {
      const fun = () => {
        throw new ForbiddenException();
      }

      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(ForbiddenException);
    });
  });

  describe("ConflictException", () => {
    it("instanceof 체크에 통과한다", () => {
      const fun = () => {
        throw new ConflictException();
      }

      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(ConflictException);
    });
  });

  describe("NotImplementedException", () => {
    it("instanceof 체크에 통과한다", () => {
      const fun = () => {
        throw new NotImplementedException();
      }

      expect(fun).toThrow(Error);
      expect(fun).toThrow(BaseException);
      expect(fun).toThrow(NotImplementedException);
    });
  });
});
