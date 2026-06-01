export interface PutToS3Options {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export class S3UploadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'S3UploadError';
    this.status = status;
  }
}

type StatusCheck = { ok: true } | { ok: false; error: S3UploadError };

function toPercent(event: ProgressEvent): number | null {
  if (!event.lengthComputable) return null;

  return Math.round((event.loaded / event.total) * 100);
}

function checkStatus(xhr: XMLHttpRequest): StatusCheck {
  if (xhr.status >= 200 && xhr.status < 300) {
    return { ok: true };
  }

  return {
    ok: false,
    error: new S3UploadError(`S3 PUT 실패 (${xhr.status})`, xhr.status),
  };
}

export function putToS3(
  url: string,
  file: File,
  options: PutToS3Options = {},
): Promise<void> {
  const { onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream',
    );

    xhr.upload.onprogress = (event) => {
      const percent = toPercent(event);
      if (percent !== null) {
        onProgress?.(percent);
      }
    };

    xhr.onload = () => {
      const result = checkStatus(xhr);

      if (result.ok) {
        onProgress?.(100);
        resolve();
      } else {
        reject(result.error);
      }
    };

    xhr.onerror = () => {
      reject(new S3UploadError('S3 PUT 네트워크 오류', 0));
    };

    xhr.onabort = () => {
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
}
