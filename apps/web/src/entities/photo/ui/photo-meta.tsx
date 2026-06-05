import { formatDateTime } from '../lib/format';
import type { Photo } from '../model/types';

interface PhotoMetaProps {
  photo: Photo;
}

export function PhotoMeta({ photo }: PhotoMetaProps) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {photo.createdBy.name} · {formatDateTime(photo.createdAt)}
    </p>
  );
}
