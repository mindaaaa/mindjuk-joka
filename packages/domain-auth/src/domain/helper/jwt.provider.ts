import { UnauthorizedException } from '@joka/core/src/exception';
import { User } from '@joka/core/src/model/User';
import { sign, verify } from 'hono/utils/jwt/jwt';

export interface JwtPayload {
  [key: string]: unknown;
  sub: string;
  name: string;
  email: string;
  iat: number;
  exp: number;
}

export class JwtProvider {
  constructor(
    private readonly accessTokenExpirySeconds: number = 15 * 60, // 15분,
    private readonly refreshTokenExpirySeconds: number = 7 * 24 * 60 * 60, // 7일,
  ) {}

  async generateAccessToken(user: User, secret: string): Promise<string> {
    return sign(
      this.convertToPayload(user, this.accessTokenExpirySeconds),
      secret,
      'HS256',
    );
  }

  private convertToPayload(user: User, expiry: number): JwtPayload {
    const now = Math.floor(Date.now() / 1000);
    return {
      sub: user.cid,
      name: user.name,
      email: user.email.value,
      iat: now,
      exp: now + expiry,
    };
  }

  async generateRefreshToken(user: User, secret: string): Promise<string> {
    return sign(
      this.convertToPayload(user, this.refreshTokenExpirySeconds),
      secret,
      'HS256',
    );
  }

  async verifyToken(token: string, secret: string): Promise<JwtPayload> {
    try {
      const payload = await verify(token, secret, 'HS256');
      return payload as JwtPayload;
    } catch {
      throw new UnauthorizedException('INVALID_TOKEN', [
        '유효하지 않은 인증 토큰입니다.',
      ]);
    }
  }
}
