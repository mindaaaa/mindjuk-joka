type Listener = (albumId: string | null) => void;

let currentAlbumId: string | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener(currentAlbumId);
  }
}

export const albumIdStore = {
  get(): string | null {
    return currentAlbumId;
  },

  set(albumId: string | null): void {
    if (currentAlbumId === albumId) return;

    currentAlbumId = albumId;
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
};
