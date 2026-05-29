import { useParams } from 'react-router-dom';

// 사진 상세 화면(제목/설명 수정 + 단건 다운로드) — 실제 구현은 후속 PR에서 진행
export function PhotoDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="mx-auto max-w-3xl p-6">
      <h2 className="text-2xl font-semibold">사진 상세</h2>
      <p className="mt-2 text-sm text-muted-foreground">id: {id}</p>
    </section>
  );
}
