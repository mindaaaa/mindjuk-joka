import { useSelectedCount } from '../model/selectors';

export function SelectedCounter() {
  const count = useSelectedCount();
  return <span className="text-sm font-medium">{count}개 선택됨</span>;
}
