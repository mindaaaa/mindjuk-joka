import { useUpdatePhotoMetaMutation } from '@/entities/photo';
import {
  useUploadQueueStore,
  type UploadQueueItem,
} from '@/features/photo-upload';

/**
 * 선택된 업로드 항목의 설명 편집
 * - value/change: 입력값(원본, 미트림)과 갱신
 * - canEdit: 업로드 성공한 항목만 편집 가능
 * - canSave/saved: 트림 비교로 저장 가능/이미 저장됨 판정
 * - save: 서버 반영 후 큐의 syncedDescription을 동기화
 */
export function useDescriptionEditor(
  selectedItem: UploadQueueItem | undefined,
) {
  const updateDescription = useUploadQueueStore((s) => s.updateDescription);
  const setStatus = useUploadQueueStore((s) => s.setStatus);
  const updateMeta = useUpdatePhotoMetaMutation();

  const value = selectedItem?.description ?? '';
  const desc = value.trim();
  const synced = (selectedItem?.syncedDescription ?? '').trim();

  const canEdit = selectedItem?.status === 'success';
  const canSave = !!selectedItem?.mediaId && desc.length > 0 && desc !== synced;
  const saved = !!selectedItem?.mediaId && desc.length > 0 && desc === synced;

  const change = (next: string) => {
    if (selectedItem) updateDescription(selectedItem.id, next);
  };

  const save = () => {
    if (!selectedItem?.mediaId || !canSave) return;
    const id = selectedItem.id;
    updateMeta.mutate(
      { id: selectedItem.mediaId, description: desc },
      { onSuccess: () => setStatus(id, { syncedDescription: desc }) },
    );
  };

  return {
    value,
    change,
    canEdit,
    canSave,
    saved,
    save,
    isSaving: updateMeta.isPending,
  };
}
