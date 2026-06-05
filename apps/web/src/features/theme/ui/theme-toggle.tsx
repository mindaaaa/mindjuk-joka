import { Moon, Sun } from 'lucide-react';

import { Button } from '@/shared/ui/button';

import { useThemeStore } from '../model/store';

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      onClick={toggle}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
