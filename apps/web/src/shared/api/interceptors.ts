import { authTokenStore } from './auth-token';
import { albumIdStore } from './album-id';

export interface ApiRequest {
  url: string;
  options: RequestInit;
}

export function attachAuthHeader(request: ApiRequest): ApiRequest {
  const token = authTokenStore.get();
  if (!token) {
    return request;
  }

  const headers = new Headers(request.options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return { ...request, options: { ...request.options, headers } };
}

export function attachAlbumHeader(request: ApiRequest): ApiRequest {
  const albumId = albumIdStore.get();
  if (!albumId) {
    return request;
  }

  const headers = new Headers(request.options.headers);
  headers.set('X-Album-Id', albumId);
  return { ...request, options: { ...request.options, headers } };
}
