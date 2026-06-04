import { useSelectedCount } from '../model/selectors';

export function SelectedCounter() {
  const count = useSelectedCount();
  return (
    <span className="text-[15px] text-muted-foreground">{count}개 선택됨</span>
  );
}
