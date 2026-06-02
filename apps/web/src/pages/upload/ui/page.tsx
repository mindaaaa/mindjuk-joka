import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  UploadDropzone,
  UploadItem,
  useUploadQueueStore,
  useUploadRunner,
} from '@/features/photo-upload';

export function UploadPage() {
  const items = useUploadQueueStore((s) => s.items);
  const reset = useUploadQueueStore((s) => s.reset);

  const { cancel } = useUploadRunner();

  const navigate = useNavigate();
  const hadItemsRef = useRef(false);

  useEffect(() => {
    if (items.length === 0) return;
    hadItemsRef.current = true;

    const inFlight = items.some(
      (item) => item.status === 'pending' || item.status === 'uploading',
    );
    if (inFlight) return;

    const successCount = items.filter(
      (item) => item.status === 'success',
    ).length;
    if (!hadItemsRef.current || successCount === 0) return;

    toast.success(`${successCount}개 업로드 완료`);
    hadItemsRef.current = false;
    reset();
    navigate('/photos');
  }, [items, navigate, reset]);

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold">업로드</h2>
        <p className="text-sm text-muted-foreground">
          이미지를 추가하면 자동으로 업로드가 시작됩니다.
        </p>
      </header>

      <UploadDropzone />

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <UploadItem key={item.id} item={item} onCancel={cancel} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
