import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom';

import { AuthPage } from '@/pages/auth';
import { PhotoDetailPage } from '@/pages/photo-detail';
import { PhotoListPage } from '@/pages/photo-list';
import { UploadPage } from '@/pages/upload';
import { TopBar } from '@/widgets/top-bar';

import { AuthGuard } from './auth-guard';
import { RouteErrorFallback } from './route-error-fallback';

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
            path: '/upload',
            element: <UploadPage />,
            errorElement: <RouteErrorFallback backTo="/photos" />,
          },
          {
            path: '/photos',
            element: <PhotoListPage />,
            errorElement: <RouteErrorFallback backTo="/photos" />,
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
