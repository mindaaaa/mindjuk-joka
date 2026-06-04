import { useEffect, useRef } from 'react';

interface UseIntersectionOptions {
  enabled?: boolean;
  rootMargin?: string;
}

export function useIntersection<T extends Element = HTMLDivElement>(
  onIntersect: () => void,
  { enabled = true, rootMargin = '200px' }: UseIntersectionOptions = {},
) {
  const targetRef = useRef<T | null>(null);
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    const element = targetRef.current;
    if (!element || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callbackRef.current();
        }
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return targetRef;
}
