import { Download } from 'lucide-react';
import { useState } from 'react';

import { downloadOne } from '../lib/downloader';
import { downloadFilename } from '../lib/filename';

import { useCurrentAlbumRole } from '@/entities/album';
import type { Photo } from '@/entities/photo';
import { ApiError } from '@/shared/api/error';
import { track } from '@/shared/lib/analytics';
import { recordForbidden } from '@/shared/lib/business-ux-logging';
import { Button, type ButtonProps } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';

interface DownloadButtonProps {
  photo: Photo;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

/** 단건 다운로드 버튼. content가 없는 사진은 비활성화된다. */
export function DownloadButton({
  photo,
  variant = 'secondary',
  size = 'icon',
}: DownloadButtonProps) {
  const role = useCurrentAlbumRole();
  const [busy, setBusy] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!photo.downloadUrl) return;

    setBusy(true);
    track('download.single_start');
    try {
      await downloadOne({
        url: photo.downloadUrl,
        filename: downloadFilename(photo),
      });
      track('download.single_success');
    } catch (err) {
      track('download.single_fail');
      if (err instanceof ApiError && err.status === 403) {
        recordForbidden({
          userRole: role ?? 'unknown',
          operationId: 'downloadMedia',
        });
        toast.error('다운로드 권한이 없거나 링크가 만료됐어요.');
      } else {
        toast.error('다운로드에 실패했어요.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={busy || !photo.downloadUrl}
      onClick={handleClick}
      aria-label="다운로드"
      aria-busy={busy}
      className={size === 'icon' ? 'rounded-full' : undefined}
    >
      <Download />
    </Button>
  );
}
