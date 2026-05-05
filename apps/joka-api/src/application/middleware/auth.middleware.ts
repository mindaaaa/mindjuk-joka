import { UnauthorizedException } from '@joka/core/src/exception';
import { createMiddleware } from 'hono/factory';
import { JwtProvider } from 'packages/domain-auth/src/domain/helper/jwt.provider';

import type { CloudflareEnv } from '../model';

const jwtProvider = new JwtProvider();

const PUBLIC_ROUTES: { method: string; path: RegExp }[] = [
  { method: 'GET', path: /^\/api\/v1\/auth\/kakao$/ },
  { method: 'GET', path: /^\/api\/v1\/auth\/callback$/ },
  { method: 'POST', path: /^\/api\/v1\/auth\/refresh$/ },
  { method: 'POST', path: /^\/api\/v1\/auth\/logout$/ },
  { method: 'GET', path: /^\/api\/?$/ },
];

const isPublicRoute = (method: string, path: string): boolean => {
  return PUBLIC_ROUTES.some(
    (route) => route.method === method && route.path.test(path),
  );
};

const authMiddleware = createMiddleware<CloudflareEnv>(async (c, next) => {
  if (isPublicRoute(c.req.method, c.req.path)) {
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('UNAUTHORIZED', [
      '인증 토큰이 필요합니다.',
    ]);
  }

  const token = authHeader.substring(7);
  const payload = await jwtProvider.verifyToken(
    token,
    c.env.JWT_SECRET,
    'ACCESS',
  );

  c.set('jwtPayload', payload);
  await next();
});

export default authMiddleware;
