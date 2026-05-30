import { authTokenStore } from './auth-token';

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
