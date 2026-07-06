import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom';

import { AuthGuard } from './auth-guard';
import { RouteErrorFallback } from './route-error-fallback';

import { AuthPage } from '@/pages/auth';
import { PhotoDetailPage } from '@/pages/photo-detail';
import { PhotoListPage } from '@/pages/photo-list';
import { UploadPage } from '@/pages/upload';
import { TopBar } from '@/widgets/top-bar';

/**
 * 모든 라우트 위에 항상 마운트되는 레이아웃.
 * - TopBar는 인증 여부와 무관하게 유지되고, AuthGuard는 Outlet 위에 들어와 분기한다.
 */
function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <Outlet />
    </div>
  );
}

/**
 * /photos와 /upload가 공유하는 레이아웃.
 * - 목록을 항상 마운트해 두고 업로드 시트는 Outlet 오버레이로 띄운다.
 * - /photos ↔ /upload 이동 시 목록이 언마운트되지 않아 사진을 다시 받지 않는다.
 */
function PhotoListLayout() {
  return (
    <>
      <PhotoListPage />
      <Outlet />
    </>
  );
}

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-md p-6">
      <h2 className="text-2xl font-semibold">404</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        요청하신 페이지를 찾을 수 없어요.
      </p>
    </section>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <AuthGuard />,
        children: [
          {
            index: true,
            element: <Navigate to="/photos" replace />,
          },
          {
            path: '/login',
            element: <AuthPage />,
            errorElement: <RouteErrorFallback backTo="/login" />,
          },
          {
            element: <PhotoListLayout />,
            errorElement: <RouteErrorFallback backTo="/photos" />,
            children: [
              { path: '/photos' },
              { path: '/upload', element: <UploadPage /> },
            ],
          },
          {
            path: '/photos/:id',
            element: <PhotoDetailPage />,
            errorElement: <RouteErrorFallback backTo="/photos" />,
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
