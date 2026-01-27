import { BaseException, InvalidArgumentException, NotFoundException, UnauthorizedException, UncaughtException, ForbiddenException } from "../../src/exception";

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
});
