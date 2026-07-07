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
import { cn } from '@/shared/lib/utils/cn';
import { Button } from '@/shared/ui/button';

/**
 * 모든 라우트에 상시 노출되는 상단 바
 * - 로그인(풀블리드)에서는 투명 오버레이로 떠서 배경 이미지를 가리지 않는다.
 * - 로고를 제외한 액션은 인증 여부로 한 지점에서만 분기한다.
 */
export function TopBar() {
  const isAuthenticated = useIsAuthenticated();
  const isImmersive = useLocation().pathname === '/login';

  return (
    <header
      className={cn(
        'top-0 z-40',
        isImmersive
          ? 'absolute inset-x-0'
          : 'sticky border-b border-border bg-background/95 backdrop-blur',
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Logo immersive={isImmersive} />
        {isAuthenticated ? <AuthActions /> : null}
      </div>
    </header>
  );
}

/** 몰입형(이미지 배경) 화면에서 가독성을 위해 그림자를 얹는다. */
function Logo({ immersive }: { immersive: boolean }) {
  return (
    <Link
      to="/photos"
      className={cn(
        'text-lg font-bold tracking-tight',
        immersive &&
          '[text-shadow:0_1px_2px_rgba(255,255,255,0.55)] dark:[text-shadow:0_1px_3px_rgba(0,0,0,0.55)]',
      )}
    >
      JOKA
    </Link>
  );
}

/** 로그인 이후에만 노출되는 액션 묶음. 요소가 늘어나도 여기서만 늘어난다. */
function AuthActions() {
  const role = useCurrentAlbumRole();
  const isListRoute = useLocation().pathname.endsWith('/photos');

  return (
    <nav className="flex items-center gap-1.5">
      {isListRoute ? <SelectToggle /> : null}
      <ThemeToggle />
      <UploadFab role={role} />
      <LogoutButton />
    </nav>
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
