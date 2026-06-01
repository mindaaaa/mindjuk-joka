import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { UserRole } from '@/entities/user';
import {
  canUpload,
  useAuthStore,
  useAuthUser,
  useIsAuthenticated,
  useLogoutMutation,
} from '@/features/auth';
import { Button } from '@/shared/ui/button';

function UploadButton({ role }: { role: UserRole | undefined }) {
  if (!canUpload(role)) return null;

  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/upload">업로드</Link>
    </Button>
  );
}

export function TopBar() {
  const isAuthenticated = useIsAuthenticated();
  const user = useAuthUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/photos" className="text-lg font-semibold tracking-tight">
          JOKA
        </Link>

        {isAuthenticated ? (
          <nav className="flex items-center gap-2">
            <UploadButton role={user?.role} />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.name}
            </span>
            <LogoutButton />
          </nav>
        ) : null}
      </div>
    </header>
  );
}

function LogoutButton() {
  const navigate = useNavigate();
  const reset = useAuthStore((s) => s.reset);
  const logoutMutation = useLogoutMutation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        reset();
        toast.success('로그아웃되었습니다.');
        navigate('/login', { replace: true });
      },
      onError: () => {
        reset();
        toast.success('네트워크 문제가 있었지만 안전하게 로그아웃되었습니다.');
        navigate('/login', { replace: true });
      },
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={logoutMutation.isPending}
      onClick={handleLogout}
    >
      {logoutMutation.isPending ? '로그아웃 중…' : '로그아웃'}
    </Button>
  );
}
