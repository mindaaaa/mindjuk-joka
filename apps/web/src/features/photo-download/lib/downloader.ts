import { ApiError } from '@/shared/api/error';

export interface DownloadTarget {
  url: string;
  filename: string;
}

export interface DownloadManyResult {
  ok: number;
  failed: number;
}

const BATCH_DELAY_MS = 300; // 연속 다운로드를 브라우저가 차단하지 않도록 항목 간 간격

function triggerAnchor(href: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = 'noopener'; // 풀백 시 새 탭이 열려도 원본 페이지 접근 차단 (보안)

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function downloadOne(target: DownloadTarget): Promise<void> {
  try {
    const response = await fetch(target.url);
    if (!response.ok) {
      throw new ApiError({ status: response.status });
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    triggerAnchor(objectUrl, target.filename);

    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  } catch (err) {
    if (err instanceof TypeError) {
      triggerAnchor(target.url, target.filename);
      return;
    }

    throw err;
  }
}

export async function downloadMany(
  targets: DownloadTarget[],
  options?: {
    onError?: (target: DownloadTarget, error: unknown) => void;
    delayMs?: number;
  },
): Promise<DownloadManyResult> {
  const delay = options?.delayMs ?? BATCH_DELAY_MS;

  let ok = 0;
  let failed = 0;

  for (const target of targets) {
    try {
      await downloadOne(target);
      ok += 1;
    } catch (err) {
      failed += 1;
      options?.onError?.(target, err);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return { ok, failed };
}
