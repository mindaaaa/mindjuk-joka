type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

export function initClarity(): void {
  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
  if (!projectId || window.clarity) return;

  const q: unknown[][] = [];

  // 스크립트 로딩 전 호출을 큐에 쌓아두는 스텁 (로딩 후 Clarity가 q를 읽어 처리)
  window.clarity = Object.assign(
    (...args: unknown[]) => {
      (window.clarity!.q ??= []).push(args);
    },
    { q },
  );

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(script);
}
