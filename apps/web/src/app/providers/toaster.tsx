import { useTheme } from '@/features/theme';
import { Toaster } from '@/shared/ui/toast';

/** 앱의 테마 토글 값을 토스트에 전달한다(shared는 features를 모르므로 app에서 주입) */
export function AppToaster() {
  const theme = useTheme();

  return <Toaster theme={theme} />;
}
