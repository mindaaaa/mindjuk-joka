import { formatBytes, formatDateTime } from '../lib/format';
import type { Photo, PhotoState } from '../model/types';

const STATE_LABEL: Record<PhotoState, string> = {
  DRAFT: '임시',
  PREPARING: '처리 중',
  COMPLETE: '완료',
};

interface MetaRowProps {
  label: string;
  value: string;
}

interface PhotoMetaProps {
  photo: Photo;
}

export function PhotoMeta({ photo }: PhotoMetaProps) {
  return (
    <dl className="divide-y divide-border rounded-md border p-4">
      <MetaRow label="작성자" value={photo.createdBy.name} />
      <MetaRow label="작성일" value={formatDateTime(photo.createdAt)} />
      <MetaRow label="상태" value={STATE_LABEL[photo.state]} />
      {photo.mimeType && <MetaRow label="형식" value={photo.mimeType} />}
      {photo.size != null && (
        <MetaRow label="크기" value={formatBytes(photo.size)} />
      )}
    </dl>
  );
}

function MetaRow({ label, value }: MetaRowProps) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}
