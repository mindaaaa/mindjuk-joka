import { UnauthorizedException } from '@joka/core/src/exception';
import { User } from '@joka/core/src/model/User';
import { sign, verify } from 'hono/utils/jwt/jwt';

type ExpectedType = 'ACCESS' | 'REFRESH';

export interface JwtPayload {
  [key: string]: unknown;
  sub: string;
  name: string;
  email: string;
  iat: number;
  exp: number;
  type: ExpectedType;
}

export class JwtProvider {
  constructor(
    private readonly accessTokenExpirySeconds: number = 15 * 60, // 15분,
    private readonly refreshTokenExpirySeconds: number = 7 * 24 * 60 * 60, // 7일,
  ) {}

  async generateAccessToken(user: User, secret: string): Promise<string> {
    return sign(this.convertToPayload(user, 'ACCESS'), secret, 'HS256');
  }

  private convertToPayload(user: User, type: ExpectedType): JwtPayload {
    const iat = Math.floor(Date.now() / 1000);
    const exp =
      iat +
      (type === 'ACCESS'
        ? this.accessTokenExpirySeconds
        : this.refreshTokenExpirySeconds);
    return {
      sub: user.cid,
      name: user.name,
      email: user.email.value,
      type,
      iat,
      exp,
    };
  }

  async generateRefreshToken(user: User, secret: string): Promise<string> {
    return sign(this.convertToPayload(user, 'REFRESH'), secret, 'HS256');
  }

  async verifyToken(
    token: string,
    secret: string,
    expectedType: ExpectedType,
  ): Promise<JwtPayload> {
    const payload = (await verify(token, secret, 'HS256').catch((_) => {
      throw new UnauthorizedException('INVALID_TOKEN', [
        '유효하지 않은 인증 토큰입니다.',
      ]);
    })) as JwtPayload;

    if (payload.type !== expectedType) {
      throw new UnauthorizedException('INVALID_TOKEN', [
        '토큰 종류가 올바르지 않습니다.',
      ]);
    }

    return payload;
  }
}
