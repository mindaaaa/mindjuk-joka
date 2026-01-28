export class BaseException extends Error {
  public readonly code: string;
  public readonly messages: string[];
  public readonly timestamp: Date;

  constructor(code: string, messages: string[]) {
    super(code);
    this.code = code;
    this.messages = messages;
    this.timestamp = new Date();
  }
}

export class InvalidArgumentException extends BaseException {
  constructor(code: string = 'INVALID_ARGUMENT', messages: string[] = []) {
    super(code, messages);
  }
}

export class NotFoundException extends BaseException {
  constructor(code: string = 'NOT_FOUND', messages: string[] = []) {
    super(code, messages);
  }
}

export class UncaughtException extends BaseException {
  constructor(code: string = 'UNCAUGHT', messages: string[] = []) {
    super(code, messages);
  }
}

export class UnauthorizedException extends BaseException {
  constructor(code: string = 'UNAUTHORIZED', messages: string[] = []) {
    super(code, messages);
  }
}

export class ForbiddenException extends BaseException {
  constructor(code: string = 'FORBIDDEN', messages: string[] = []) {
    super(code, messages);
  }
}
