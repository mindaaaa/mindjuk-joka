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

const KNOWN_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
  'heic',
]);

function extensionFromMime(mimeType?: string): string {
  return (mimeType && MIME_EXTENSION[mimeType]) || 'jpg';
}

/**
 * 파일 이름에서 알려진 확장자(예: .jpg, .png)가 포함되어 있다면 이를 제거합니다.
 * - 확장자가 없거나 등록되지 않은 확장자일 경우 원본 이름을 그대로 반환합니다.
 * @example
 * stripExtension('photo.jpg'); // 이름이 'photo'로 반환 (KNOWN_EXTENSIONS에 있는 경우)
 * stripExtension('.gitignore'); // 숨김 파일 형태는 원본 그대로 '.gitignore' 반환
 * stripExtension('archive.tar.gz'); // 'archive.tar' 반환 (마지막 확장자만 제거)
 */
function stripExtension(name: string): string {
  const lastDotIndex = name.lastIndexOf('.');

  const hasNoExtension = lastDotIndex <= 0;
  if (hasNoExtension) return name;

  const extension = name.slice(lastDotIndex + 1).toLowerCase();
  const nameWithoutExtension = name.slice(0, lastDotIndex);

  return KNOWN_EXTENSIONS.has(extension) ? nameWithoutExtension : name;
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
  const base = stripExtension(sanitize(photo.description)) || photo.id;

  return `${base}.${extensionFromMime(photo.mimeType)}`;
}
