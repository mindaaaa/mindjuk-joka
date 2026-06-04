import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useUpdatePhotoMetaMutation, type Photo } from '@/entities/photo';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';

interface EditMetaFormProps {
  photo: Photo;
  canEdit: boolean;
}

export function EditMetaForm({ photo, canEdit }: EditMetaFormProps) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(photo.description);

  const mutation = useUpdatePhotoMetaMutation();

  useEffect(() => {
    if (!editing) {
      setDescription(photo.description);
    }
  }, [photo.description, editing]);

  const trimmed = description.trim();
  const isValid = trimmed.length >= 1;
  const isDirty = trimmed !== photo.description;
  const canSave = isValid && isDirty && !mutation.isPending;

  const handleSave = () => {
    if (!canSave) return;
    mutation.mutate(
      { id: photo.id, description: trimmed },
      {
        onSuccess: () => {
          toast.success('설명을 수정했어요.');
          setEditing(false);
        },
        onError: () => toast.error('설명 수정에 실패했어요.'),
      },
    );
  };

  const handleCancel = () => {
    setDescription(photo.description);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <p className="whitespace-pre-wrap wrap-break-word text-base">
          {photo.description}
        </p>
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
            편집
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="사진 설명"
        autoFocus
        disabled={mutation.isPending}
      />
      {!isValid && (
        <p className="text-xs text-destructive">설명을 입력해 주세요.</p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={mutation.isPending}
        >
          취소
        </Button>
        <Button type="submit" size="sm" disabled={!canSave}>
          {mutation.isPending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </form>
  );
}
