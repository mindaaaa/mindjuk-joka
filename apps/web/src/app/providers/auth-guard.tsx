import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { initClarity } from '@/app/providers/clarity';
import { useAlbums, useAlbumStore } from '@/entities/album';
import { useAuthStore, useMe, canUpload } from '@/features/auth';
import { CLARITY_PENDING_KEY } from '@/features/auth/ui/login-form';
import { authTokenStore } from '@/shared/api/auth-token';
import { readCookie } from '@/shared/api/cookie';
import { setAnalyticsUser, track } from '@/shared/lib/analytics';
import { grantConsent, revokeConsent } from '@/shared/lib/consent';
import { Skeleton } from '@/shared/ui/skeleton';

const PUBLIC_PATHS = new Set(['/login']);
const EDITOR_ONLY_PATHS: Array<string | RegExp> = ['/upload'];

function bootstrapAccessToken() {
  if (authTokenStore.get()) return;

  const cookieToken = readCookie('accessToken');
  if (cookieToken) {
    authTokenStore.set(cookieToken);
  }
}

function isEditorOnly(path: string): boolean {
  return EDITOR_ONLY_PATHS.some((pattern) =>
    typeof pattern === 'string' ? path.startsWith(pattern) : pattern.test(path),
  );
}

export function AuthGuard() {
  const location = useLocation();

  const setUser = useAuthStore((s) => s.setUser);
  const status = useAuthStore((s) => s.status);

  const setAlbum = useAlbumStore((s) => s.setCurrent);
  const clearAlbum = useAlbumStore((s) => s.clear);
  const currentAlbum = useAlbumStore((s) => s.current);

  const loginTrackedRef = useRef(false);

  useEffect(() => {
    bootstrapAccessToken();
  }, []);

  // unauthenticated 상태에서 /me 재요청을 막아 로그아웃이 되살아나지 않게 한다
  const meQuery = useMe({ enabled: status !== 'unauthenticated' });

  useEffect(() => {
    if (meQuery.isSuccess) {
      setUser(meQuery.data);

      void setAnalyticsUser(meQuery.data.id).then(() => {
        // 새 탭/새로고침 시 /me가 중복 호출되므로, 탭 단위 최초 1회만 로그인으로 집계
        if (!loginTrackedRef.current) {
          loginTrackedRef.current = true;
          track('auth.login_success');

          if (sessionStorage.getItem(CLARITY_PENDING_KEY)) {
            sessionStorage.removeItem(CLARITY_PENDING_KEY);
            grantConsent();
            initClarity();
          }
        }
      });
    } else if (meQuery.isError) {
      setUser(null);
      clearAlbum();
      void setAnalyticsUser(null);
      revokeConsent();
    }
  }, [meQuery.isSuccess, meQuery.isError, meQuery.data, setUser, clearAlbum]);

  const albumsQuery = useAlbums({ enabled: meQuery.isSuccess });

  useEffect(() => {
    if (!albumsQuery.isSuccess) return;

    // 앨범 접근권을 잃었으면(강퇴/삭제) 선택 해제
    if (currentAlbum) {
      const stillExists = albumsQuery.data.some(
        (a) => a.id === currentAlbum.id,
      );
      if (!stillExists) setAlbum(null);
    }
  }, [albumsQuery.isSuccess, albumsQuery.data, currentAlbum, setAlbum]);

  const isPublic = PUBLIC_PATHS.has(location.pathname);

  if (isPublic && status !== 'authenticated') {
    return <Outlet />;
  }

  const isCheckingSession = status === 'idle' && meQuery.isPending;
  if (isCheckingSession) {
    return <GuardFallback />;
  }

  const isBlockedFromPrivate = status === 'unauthenticated' && !isPublic;
  if (isBlockedFromPrivate) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const isAlreadyLoggedIn = status === 'authenticated' && isPublic;
  if (isAlreadyLoggedIn) {
    return <Navigate to="/photos" replace />;
  }

  // /albums는 제외 — 안 그러면 무한 리다이렉트
  const isAlbumSelectRoute = location.pathname === '/albums';
  const needsAlbumSelection =
    status === 'authenticated' &&
    !isPublic &&
    !isAlbumSelectRoute &&
    !currentAlbum;

  if (needsAlbumSelection) {
    if (albumsQuery.isPending) return <GuardFallback />;
    return <Navigate to="/albums" replace />;
  }

  const isEditorRoute = isEditorOnly(location.pathname);
  const isAlbumRolePending = !currentAlbum && !albumsQuery.isError;
  const shouldDeferUploadGuard =
    status === 'authenticated' && isEditorRoute && isAlbumRolePending;

  if (shouldDeferUploadGuard) {
    return <GuardFallback />;
  }

  const lacksUploadPermission =
    status === 'authenticated' &&
    isEditorRoute &&
    !canUpload(currentAlbum?.role);
  if (lacksUploadPermission) {
    return <Navigate to="/photos" replace />;
  }

  return <Outlet />;
}

function GuardFallback() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-4 h-64 w-full" />
    </div>
  );
}
