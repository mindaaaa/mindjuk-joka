const SPLASH_MIN_MS = 1800;

/**
 * 최소 노출 시간(SPLASH_MIN_MS)을 보장한 뒤 스플래시를 제거한다.
 */
export function hideSplashWithFloor() {
  const remaining = SPLASH_MIN_MS - performance.now();

  if (remaining > 0) {
    window.setTimeout(hideSplash, remaining);
  } else {
    hideSplash();
  }
}

/**
 * #splash-overlay를 페이드아웃 후 제거한다.
 * - idempotent(멱등), 트랜지션 실패에도 안전.
 */
export function hideSplash() {
  const el = document.getElementById('splash-overlay');
  if (!el) return;

  el.style.opacity = '0';
  el.style.pointerEvents = 'none';

  const remove = () => el.remove();
  el.addEventListener('transitionend', remove, { once: true });
  window.setTimeout(remove, 300); // transitionend 폴백
}
