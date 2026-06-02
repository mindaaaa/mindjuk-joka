import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAlbums, useAlbumStore } from '@/entities/album';
import { useAuthStore, useMe, canUpload } from '@/features/auth';
import { authTokenStore } from '@/shared/api/auth-token';
import { readCookie } from '@/shared/api/cookie';
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
  const user = useAuthStore((s) => s.user);

  const setAlbum = useAlbumStore((s) => s.setCurrent);
  const clearAlbum = useAlbumStore((s) => s.clear);
  const currentAlbum = useAlbumStore((s) => s.current);

  useEffect(() => {
    bootstrapAccessToken();
  }, []);

  const meQuery = useMe();

  useEffect(() => {
    if (meQuery.isSuccess) {
      setUser(meQuery.data);
    } else if (meQuery.isError) {
      setUser(null);
      clearAlbum();
    }
  }, [meQuery.isSuccess, meQuery.isError, meQuery.data, setUser, clearAlbum]);

  const albumsQuery = useAlbums({ enabled: meQuery.isSuccess });

  useEffect(() => {
    if (!albumsQuery.isSuccess) return;

    const first = albumsQuery.data[0] ?? null;
    const shouldUpdate = first !== null && first.id !== currentAlbum?.id;

    if (shouldUpdate) {
      setAlbum(first);
    }
  }, [albumsQuery.isSuccess, albumsQuery.data, currentAlbum?.id, setAlbum]);

  const isPublic = PUBLIC_PATHS.has(location.pathname);

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

  const lacksUploadPermission =
    status === 'authenticated' &&
    isEditorOnly(location.pathname) &&
    !canUpload(user?.role);
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
