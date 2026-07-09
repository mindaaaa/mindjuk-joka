const KEY = 'joka_analytics_consent';

export function grantConsent(): void {
  localStorage.setItem(KEY, 'granted');
}

export function revokeConsent(): void {
  localStorage.removeItem(KEY);
}

export function hasConsent(): boolean {
  return localStorage.getItem(KEY) === 'granted';
}
