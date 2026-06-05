import { Check } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useUpdatePhotoMetaMutation } from '@/entities/photo';
import {
  UploadDropzone,
  UploadItem,
  useUploadQueueStore,
  useUploadRunner,
} from '@/features/photo-upload';
import { PhotoListPage } from '@/pages/photo-list'; // TODO: 목록 콘텐츠 widget 추출/라우터 오버레이
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export function UploadPage() {
  const items = useUploadQueueStore((s) => s.items);
  const reset = useUploadQueueStore((s) => s.reset);
  const updateDescription = useUploadQueueStore((s) => s.updateDescription);
  const setStatus = useUploadQueueStore((s) => s.setStatus);

  const { cancel, cancelAll } = useUploadRunner();
  const updateMeta = useUpdatePhotoMetaMutation();

  const navigate = useNavigate();

  // 딤·ESC 닫기 (업로드 중엔 무시, 중단은 "취소" 버튼으로)
  const close = useCallback(() => {
    const flying = useUploadQueueStore
      .getState()
      .items.some((i) => i.status === 'pending' || i.status === 'uploading');
    if (flying) return;

    reset();
    navigate('/photos');
  }, [reset, navigate]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = items.find((i) => i.id === selectedId) ?? items[0];

  const inFlight = items.some(
    (i) => i.status === 'pending' || i.status === 'uploading',
  );

  const canEditDesc = selectedItem?.status === 'success';

  const selectedDesc = (selectedItem?.description ?? '').trim();
  const selectedSynced = (selectedItem?.syncedDescription ?? '').trim();
  const canSaveDesc =
    !!selectedItem?.mediaId &&
    selectedDesc.length > 0 &&
    selectedDesc !== selectedSynced;
  const descSaved =
    !!selectedItem?.mediaId &&
    selectedDesc.length > 0 &&
    selectedDesc === selectedSynced;

  const handleSaveDescription = () => {
    if (!selectedItem?.mediaId || !canSaveDesc) return;
    const id = selectedItem.id;
    updateMeta.mutate(
      { id: selectedItem.mediaId, description: selectedDesc },
      { onSuccess: () => setStatus(id, { syncedDescription: selectedDesc }) },
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const hasItems = items.length > 0;

  return (
    <>
      {/* 배경 */}
      <div aria-hidden className="pointer-events-none">
        <PhotoListPage />
      </div>
      {/* 딤 (클릭 시 닫기) */}
      <button
        type="button"
        aria-label="닫기"
        className="fixed inset-0 z-20 bg-black/20"
        onClick={close}
      />

      {/* 바텀시트 */}
      <section className="fixed inset-x-0 bottom-0 z-30">
        <div className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto rounded-t-3xl border-t border-border bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          {/* 핸들 */}
          <div className="flex justify-center pb-6 pt-3">
            <span aria-hidden className="h-1 w-12 rounded-full bg-muted" />
          </div>

          {hasItems ? (
            <>
              {/* 헤더 */}
              <header className="px-6 pb-4">
                <h2 className="text-base font-semibold leading-6 tracking-tight">
                  업로드된 사진
                </h2>
                <p className="pt-0.5 text-sm leading-5 text-muted-foreground">
                  {items.length}개의 사진
                </p>
              </header>

              {/* 썸네일 */}
              <div className="flex gap-3 overflow-x-auto px-6 pb-6 pt-2">
                {items.map((item) => (
                  <UploadItem
                    key={item.id}
                    item={item}
                    selected={selectedItem?.id === item.id}
                    onSelect={setSelectedId}
                    onCancel={cancel}
                  />
                ))}
              </div>

              {/* 설명 + 저장 (선택사항) */}
              <div className="flex items-center gap-2 px-6">
                <Input
                  value={selectedItem?.description ?? ''}
                  onChange={(e) =>
                    selectedItem &&
                    updateDescription(selectedItem.id, e.target.value)
                  }
                  disabled={!canEditDesc}
                  placeholder={
                    !selectedItem
                      ? ''
                      : canEditDesc
                        ? `${selectedItem.file.name}에 남기실 말이 있으신가요?`
                        : '업로드되면 설명을 남길 수 있어요'
                  }
                  maxLength={120}
                  className="h-[45px] flex-1 rounded-[14px] border-transparent bg-muted text-muted-foreground placeholder:text-muted-foreground/60"
                />
                <Button
                  type="button"
                  onClick={handleSaveDescription}
                  disabled={!canSaveDesc || updateMeta.isPending}
                  className="h-[45px] shrink-0 gap-1 rounded-[14px] px-4"
                >
                  {descSaved ? (
                    <>
                      <Check className="size-4" />
                      저장됨
                    </>
                  ) : updateMeta.isPending ? (
                    '저장 중…'
                  ) : (
                    '저장'
                  )}
                </Button>
              </div>

              {/* 액션: 업로드 중이면 취소(중단), 끝나면 완료(닫기) */}
              <div className="px-6 pb-6 pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={inFlight ? cancelAll : close}
                  className="h-12 w-full rounded-[14px] text-base font-medium"
                >
                  {inFlight ? '취소' : '완료'}
                </Button>
              </div>
            </>
          ) : (
            <div className="px-6 pb-6">
              {/* 드롭존 */}
              <UploadDropzone />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
