import { LogOut, Plus } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useCurrentAlbumRole } from '@/entities/album';
import type { UserRole } from '@/entities/user';
import {
  canUpload,
  useAuthStore,
  useIsAuthenticated,
  useLogoutMutation,
} from '@/features/auth';
import { SelectToggle } from '@/features/photo-select';
import { ThemeToggle } from '@/features/theme';
import { Button } from '@/shared/ui/button';

export function TopBar() {
  const isAuthenticated = useIsAuthenticated();
  const role = useCurrentAlbumRole();
  const isListRoute = useLocation().pathname.endsWith('/photos');

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/photos" className="text-lg font-bold tracking-tight">
          JOKA
        </Link>

        <nav className="flex items-center gap-1.5">
          {isAuthenticated && isListRoute ? <SelectToggle /> : null}
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <UploadFab role={role} />
              <LogoutButton />
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

function UploadFab({ role }: { role: UserRole | undefined }) {
  if (!canUpload(role)) return null;

  return (
    <Button
      asChild
      size="icon"
      className="rounded-full"
      aria-label="사진 올리기"
    >
      <Link to="/upload">
        <Plus />
      </Link>
    </Button>
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
      variant="ghost"
      size="icon"
      aria-label="로그아웃"
      disabled={logoutMutation.isPending}
      onClick={handleLogout}
    >
      <LogOut />
    </Button>
  );
}
