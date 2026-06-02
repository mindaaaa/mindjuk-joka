const IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const VIDEO_MIME = ['video/mp4', 'video/quicktime'];

const ALLOWED_MIME = new Set([...IMAGE_MIME, ...VIDEO_MIME]);

// file.type이 비어 들어오는 케이스(iOS HEIC) 보완용 확장자 화이트리스트
const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
  'mp4',
  'mov',
]);

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB 초과 → 거부
export const WARN_FILE_SIZE = 20 * 1024 * 1024; // 20MB 이상 → 경고

export type ValidationResult =
  | { ok: true; warning?: string }
  | { ok: false; reason: 'mime' | 'size'; message: string };

function getExtension(name: string): string {
  const dotIdx = name.lastIndexOf('.');

  if (dotIdx < 0) return '';
  return name.slice(dotIdx + 1).toLowerCase();
}

function toMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function isAllowedType(file: File): boolean {
  if (file.type && ALLOWED_MIME.has(file.type)) return true;

  const extension = getExtension(file.name);
  return ALLOWED_EXTENSIONS.has(extension);
}

export function validateFile(file: File): ValidationResult {
  if (!isAllowedType(file)) {
    return {
      ok: false,
      reason: 'mime',
      message: `지원하지 않는 형식이에요 (${file.type || getExtension(file.name) || '알 수 없음'})`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      reason: 'size',
      message: `파일이 너무 커요 (${toMb(file.size)}MB, 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    };
  }

  if (file.size >= WARN_FILE_SIZE) {
    return {
      ok: true,
      warning: `파일이 커서 업로드가 오래 걸릴 수 있어요 (${toMb(file.size)}MB)`,
    };
  }

  return { ok: true };
}
