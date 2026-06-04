import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'joka-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme);
    }
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));

export const useTheme = () => useThemeStore((s) => s.theme);

/** 앱 진입 시 1회 호출 — 초기 테마를 화면에 미리 반영해 깜빡임 방지 */
export function initTheme() {
  applyTheme(useThemeStore.getState().theme);
}
