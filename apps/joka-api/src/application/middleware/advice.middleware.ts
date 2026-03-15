import {
  BaseException,
  ConflictException,
  ForbiddenException,
  IllegalStateException,
  InvalidArgumentException,
  NotImplementedException,
  NotFoundException,
  UnauthorizedException,
  UncaughtException,
} from '@joka/core/src/exception';
import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';

import type { CloudflareEnv } from '../model';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

const resolveStatus = (error: Error): ContentfulStatusCode => {
  if (error instanceof InvalidArgumentException) {
    return 400;
  }
  if (error instanceof UnauthorizedException) {
    return 401;
  }
  if (error instanceof ForbiddenException) {
    return 403;
  }
  if (error instanceof NotFoundException) {
    return 404;
  }
  if (error instanceof ConflictException) {
    return 409;
  }
  if (error instanceof IllegalStateException) {
    return 409;
  }
  if (error instanceof UncaughtException) {
    return 500;
  }
  if (error instanceof NotImplementedException) {
    return 501;
  }
  if (error instanceof ZodError) {
    return 400;
  }

  return 500;
};

const resolveCode = (error: Error): string => {
  if (error instanceof BaseException) {
    return error.code;
  }
  if (error instanceof ZodError) {
    return 'INVALID_ARGUMENT';
  }

  return 'UNKNOWN';
};

const resolveMessages = (error: Error): string[] => {
  if (error instanceof BaseException) {
    return error.messages;
  }
  if (error instanceof ZodError) {
    return error.issues.map((i) => i.message);
  }

  return ['처리되지 않은 에러입니다'];
};

const resolveTimestamp = (error: Error): string => {
  if (error instanceof BaseException) {
    return error.timestamp.toISOString();
  }

  return new Date().toISOString();
};

const errorHandler: ErrorHandler<CloudflareEnv> = (error, c) => {
  const status = resolveStatus(error);
  const traceId = c.get('actor')?.traceId ?? NIL_UUID;

  return c.json(
    {
      traceId,
      path: c.req.path,
      status: status,
      code: resolveCode(error),
      messages: resolveMessages(error),
      timestamp: resolveTimestamp(error),
    },
    status,
  );
};

export default errorHandler;
