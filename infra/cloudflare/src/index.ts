export interface Env {
  MEDIA_BUCKET: R2Bucket;
  CACHE_KV: KVNamespace;
}

/** Joka - Local Development Worker * 로컬에서 R2, KV를 테스트하기 위한 더미 워커 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 헬스체크
    if (url.pathname === '/') {
      return new Response('Joka Local Dev Server is running!', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // R2 버킷 테스트: GET /r2/:key
    if (url.pathname.startsWith('/r2/')) {
      const key = url.pathname.slice(4);

      if (request.method === 'GET') {
        const object = await env.MEDIA_BUCKET.get(key);
        if (!object) {
          return new Response('Not Found', { status: 404 });
        }
        return new Response(object.body);
      }

      if (request.method === 'PUT') {
        const body = await request.arrayBuffer();
        await env.MEDIA_BUCKET.put(key, body);
        return new Response('OK', { status: 200 });
      }

      if (request.method === 'DELETE') {
        await env.MEDIA_BUCKET.delete(key);
        return new Response('Deleted', { status: 200 });
      }
    }

    // KV 테스트: GET/PUT /kv/:key
    if (url.pathname.startsWith('/kv/')) {
      const key = url.pathname.slice(4);

      if (request.method === 'GET') {
        const value = await env.CACHE_KV.get(key);
        if (!value) {
          return new Response('Not Found', { status: 404 });
        }
        return new Response(value);
      }

      if (request.method === 'PUT') {
        const body = await request.text();
        await env.CACHE_KV.put(key, body);
        return new Response('OK', { status: 200 });
      }

      if (request.method === 'DELETE') {
        await env.CACHE_KV.delete(key);
        return new Response('Deleted', { status: 200 });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
