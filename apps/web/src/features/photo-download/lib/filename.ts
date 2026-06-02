import type { Photo } from '@/entities/photo';

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/heic': 'heic',
};

const MAX_BASE_LENGTH = 100;

function extensionFromMime(mimeType?: string): string {
  return (mimeType && MIME_EXTENSION[mimeType]) || 'jpg';
}

function sanitize(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BASE_LENGTH);
}

export function downloadFilename(
  photo: Pick<Photo, 'id' | 'description' | 'mimeType'>,
): string {
  const base = sanitize(photo.description) || photo.id;

  return `${base}.${extensionFromMime(photo.mimeType)}`;
}
