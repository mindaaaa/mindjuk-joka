import {
  zCreateMedia,
  zCreateContent,
  zConfirmMedia,
  zUpdateMedia,
} from '@joka/lib-openapi';
import {
  ConfirmMediaResponses,
  CreateContentResponses,
  CreateUploadUrlForMediaResponses,
} from '@joka/lib-openapi/src/generated/type/types.gen';
import { Hono } from 'hono';

import {
  toContentResponse,
  toMediaResponse,
  toPaginationResponse,
} from './media.mapper';
import type { CloudflareEnv } from '../../../application/model';
import {
  ConfirmMedia,
  CreateContent,
  CreateMedia,
  CreateUploadUrlForMedia,
  DeleteMedia,
  UpdateMedia,
  GetMedia,
  ListMedia,
  AddFavorite,
  RemoveFavorite,
} from '../../../application/use-case';

const media = new Hono<CloudflareEnv>().basePath('/v1/media');

media.post('/', async (c) => {
  const body = zCreateMedia.parse(await c.req.json());
  const actor = c.get('actor');

  const result = await CreateMedia.invoke({
    actor,
    description: body.description,
  });

  c.header('Location', `/api/v1/media/${result.cid}`);
  return c.json(await toMediaResponse(result), 201);
});

media.get('/', async (c) => {
  const invokeRequest: Record<string, string> = {};
  const size = c.req.query('size');
  const order = c.req.query('order');
  const cursor = c.req.query('cursor');
  const states = c.req.query('states');
  const isFavorite = c.req.query('isFavorite');

  if (size) {
    invokeRequest.size = size;
  }
  if (order) {
    invokeRequest.order = order;
  }
  if (cursor) {
    invokeRequest.cursor = cursor;
  }
  if (states) {
    invokeRequest.states = states;
  }
  if (isFavorite) {
    invokeRequest.isFavorite = isFavorite;
  }

  const actor = c.get('actor');

  const result = await ListMedia.invoke({
    actor,
    ...invokeRequest,
  });

  return c.json(
    {
      items: await Promise.all(result.items.map(toMediaResponse)),
      pagination: toPaginationResponse(result.pagination),
    },
    200,
  );
});

media.get('/:mediaId', async (c) => {
  const mediaCid = c.req.param('mediaId');
  const actor = c.get('actor');

  const result = await GetMedia.invoke({
    actor,
    mediaCid,
  });

  return c.json(await toMediaResponse(result), 200);
});

media.patch('/:mediaId', async (c) => {
  const mediaCid = c.req.param('mediaId');
  const body = zUpdateMedia.parse(await c.req.json());
  const actor = c.get('actor');

  const request = body.description ? { description: body.description } : {};

  const result = await UpdateMedia.invoke({
    actor,
    mediaCid,
    ...request,
  });

  return c.json(await toMediaResponse(result), 200);
});

media.post('/:mediaId/upload-urls', async (c) => {
  const mediaCid = c.req.param('mediaId');
  const actor = c.get('actor');

  const result = await CreateUploadUrlForMedia.invoke({
    actor,
    mediaCid,
  });

  return c.json(result as CreateUploadUrlForMediaResponses[201], 201);
});

media.post('/:mediaId/contents', async (c) => {
  const mediaCid = c.req.param('mediaId');
  const body = zCreateContent.parse(await c.req.json());
  const actor = c.get('actor');

  const result = await CreateContent.invoke({
    actor,
    mediaCid,
    url: body.url,
  });

  c.header('Location', `/api/v1/media/${mediaCid}`);
  return c.json(
    (await toContentResponse(result.data)) as CreateContentResponses[201],
    201,
  );
});

media.post('/:mediaId/confirm', async (c) => {
  const mediaCid = c.req.param('mediaId');
  zConfirmMedia.parse(await c.req.json().catch(() => ({})));
  const actor = c.get('actor');

  const result = await ConfirmMedia.invoke({
    actor,
    mediaCid,
  });

  // 확정 성공 후 썸네일 추출 작업을 큐에 발행한다(best-effort·non-blocking).
  c.executionCtx.waitUntil(c.env.THUMBNAIL_QUEUE.send({ mediaCid }));

  return c.json(
    (await toMediaResponse(result)) as ConfirmMediaResponses[200],
    200,
  );
});

media.delete('/:mediaId', async (c) => {
  const mediaCid = c.req.param('mediaId');
  const actor = c.get('actor');

  await DeleteMedia.invoke({
    actor,
    mediaCid,
  });

  return c.body(null, 204);
});

media.put('/:mediaId/favorite', async (c) => {
  const mediaCid = c.req.param('mediaId');
  const actor = c.get('actor');

  await AddFavorite.invoke({
    actor,
    mediaCid,
  });

  return c.body(null, 204);
});

media.delete('/:mediaId/favorite', async (c) => {
  const mediaCid = c.req.param('mediaId');
  const actor = c.get('actor');

  await RemoveFavorite.invoke({
    actor,
    mediaCid,
  });

  return c.body(null, 204);
});

export default media;
