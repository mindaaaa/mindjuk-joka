type Listener = (token: string | null) => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener(accessToken);
  }
}

export const authTokenStore = {
  get(): string | null {
    return accessToken;
  },

  set(token: string | null): void {
    if (accessToken === token) {
      return;
    }
    accessToken = token;
    notify();
  },

  clear(): void {
    this.set(null);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // React 외부에서 "구독 즉시 현재 값도 받고 싶을 때"만 사용
  // useSyncExternalStore에 넘기지 말 것 (불필요한 재확인 유발)
  subscribeWithCurrent(listener: Listener): () => void {
    listener(accessToken);
    return this.subscribe(listener);
  },
};
