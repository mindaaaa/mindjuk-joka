import {
  InvalidArgumentException,
  UnauthorizedException,
} from '@joka/core/src/exception';
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { CookieOptions } from 'hono/dist/types/utils/cookie';

import Config from '../../../application/config';
import type { CloudflareEnv } from '../../../application/model';
import { RefreshTokenStore } from '../../token/refresh-token.store';

const auth = new Hono<CloudflareEnv>().basePath('/v1/auth');

const refreshTokenStore = new RefreshTokenStore();

function buildAuthConfig(c: { env: CloudflareEnv['Bindings'] }) {
  return {
    kakaoClientId: c.env.KAKAO_CLIENT_ID,
    kakaoClientSecret: c.env.KAKAO_CLIENT_SECRET,
    kakaoRedirectUri: c.env.KAKAO_REDIRECT_URI,
    jwtSecret: c.env.JWT_SECRET,
  };
}

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7일

auth.get('/kakao', (c) => {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${c.env.KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(c.env.KAKAO_REDIRECT_URI)}&response_type=code`;
  return c.redirect(kakaoAuthUrl);
});

auth.get('/callback', async (c) => {
  const error = c.req.query('error');
  if (error) {
    throw new UnauthorizedException('KAKAO_AUTH_DENIED', [
      '카카오 인증이 거부되었습니다.',
    ]);
  }

  const code = c.req.query('code');
  if (!code) {
    throw new InvalidArgumentException('INVALID_ARGUMENT', [
      '인증 코드가 필요합니다.',
    ]);
  }

  const config = buildAuthConfig(c);
  const { tokenPair, user } = await Config.authService.login(code, config);

  await refreshTokenStore.store(
    tokenPair.refreshToken,
    user.id,
    c.env.AUTH_TOKENS,
  );

  // OAuth redirect 체인은 외부 사이트 → 로컬 도메인으로 진입하므로
  // SameSite=Strict이면 Set-Cookie가 cross-site initiated context에서 누락될 수 있다.
  // 또한 Secure는 HTTPS에서만 의미가 있어 로컬 HTTP에선 일부 브라우저가 거절한다.
  const isHttps = new URL(c.req.url).protocol === 'https:';

  setCookie(
    c,
    'refreshToken',
    tokenPair.refreshToken,
    (() => {
      const options: CookieOptions = {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'Lax',
        path: '/api/v1/auth',
        maxAge: REFRESH_TOKEN_MAX_AGE,
      };
      if (c.env.COOKIE_DOMAIN) {
        options.domain = c.env.COOKIE_DOMAIN;
      }
      return options;
    })(),
  );

  setCookie(
    c,
    'accessToken',
    tokenPair.accessToken,
    (() => {
      const options: CookieOptions = {
        httpOnly: false,
        secure: isHttps,
        sameSite: 'Lax',
        path: '/',
        maxAge: 15 * 60, // 15분
      };
      if (c.env.COOKIE_DOMAIN) {
        options.domain = c.env.COOKIE_DOMAIN;
      }
      return options;
    })(),
  );

  return c.redirect(c.env.AUTH_SUCCESS_REDIRECT ?? '/api');
});

auth.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refreshToken');

  if (!refreshToken) {
    throw new UnauthorizedException('UNAUTHORIZED', [
      '리프레시 토큰이 필요합니다.',
    ]);
  }

  const userId = await refreshTokenStore.validate(
    refreshToken,
    c.env.AUTH_TOKENS,
  );

  if (!userId) {
    throw new UnauthorizedException('INVALID_REFRESH_TOKEN', [
      '유효하지 않은 리프레시 토큰입니다.',
    ]);
  }

  const config = buildAuthConfig(c);
  const { tokenPair } = await Config.authService.refresh(refreshToken, config);

  await refreshTokenStore.revoke(refreshToken, c.env.AUTH_TOKENS);
  await refreshTokenStore.store(
    tokenPair.refreshToken,
    userId,
    c.env.AUTH_TOKENS,
  );

  const isHttps = new URL(c.req.url).protocol === 'https:';
  setCookie(
    c,
    'refreshToken',
    tokenPair.refreshToken,
    (() => {
      const options: CookieOptions = {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'Lax',
        path: '/api/v1/auth',
        maxAge: REFRESH_TOKEN_MAX_AGE,
      };
      if (c.env.COOKIE_DOMAIN) {
        options.domain = c.env.COOKIE_DOMAIN;
      }

      return options;
    })(),
  );

  return c.json({ accessToken: tokenPair.accessToken }, 200);
});

auth.post('/logout', async (c) => {
  const refreshToken = getCookie(c, 'refreshToken');

  if (refreshToken) {
    await refreshTokenStore.revoke(refreshToken, c.env.AUTH_TOKENS);
  }

  deleteCookie(
    c,
    'refreshToken',
    (() => {
      const options: CookieOptions = {
        path: '/api/v1/auth',
      };
      if (c.env.COOKIE_DOMAIN) {
        options.domain = c.env.COOKIE_DOMAIN;
      }
      return options;
    })(),
  );
  deleteCookie(
    c,
    'accessToken',
    (() => {
      const options: CookieOptions = {
        path: '/',
      };
      if (c.env.COOKIE_DOMAIN) {
        options.domain = c.env.COOKIE_DOMAIN;
      }
      return options;
    })(),
  );

  return c.body(null, 204);
});

export default auth;
