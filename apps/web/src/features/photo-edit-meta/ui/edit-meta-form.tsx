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
      <div className="flex items-center justify-center gap-2">
        <p className="whitespace-pre-wrap wrap-break-word text-center text-[15px] leading-[22.5px] tracking-[-0.234px] text-foreground/80">
          {photo.description}
        </p>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 rounded-full text-muted-foreground"
            aria-label="설명 편집"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
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
        className="h-auto rounded-none border-0 border-b border-border bg-transparent px-0 pb-1 text-center text-[15px] leading-[22.5px] shadow-none focus-visible:ring-0"
      />
      {!isValid && (
        <p className="text-center text-xs text-destructive">
          설명을 입력해 주세요.
        </p>
      )}

      {/* TODO: 같은 제목 일괄 수정 스코프 (현재 단건 description만 수정) */}

      <div className="flex justify-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 rounded-[10px]"
          onClick={handleCancel}
          disabled={mutation.isPending}
        >
          취소
        </Button>
        <Button
          type="submit"
          className="flex-1 rounded-[10px]"
          disabled={!canSave}
        >
          {mutation.isPending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </form>
  );
}
