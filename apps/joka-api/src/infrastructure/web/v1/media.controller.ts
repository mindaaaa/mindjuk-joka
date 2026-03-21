import { zCreateMedia, zUpdateMedia } from '@joka/lib-openapi';
import { Hono } from 'hono';

import { toMediaResponse, toPaginationResponse } from './media.mapper';
import type { CloudflareEnv } from '../../../application/model';
import {
  CreateMedia,
  DeleteMedia,
  UpdateMedia,
  GetMedia,
  ListMedia,
} from '../../../application/use-case';

const media = new Hono<CloudflareEnv>().basePath('/v1/media');

media.post('/', async (c) => {
  const body = zCreateMedia.parse(await c.req.json());
  const actor = c.get('actor');

  const result = await CreateMedia.invoke({
    actor,
    description: body.description,
  });

  return c.json(toMediaResponse(result), 201);
});

media.get('/', async (c) => {
  const invokeRequest: Record<string, string> = {};
  const size = c.req.query('size');
  const order = c.req.query('order');
  const cursor = c.req.query('cursor');
  const states = c.req.query('states');

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

  const actor = c.get('actor');

  const result = await ListMedia.invoke({
    actor,
    ...invokeRequest,
  });

  return c.json(
    {
      items: result.items.map(toMediaResponse),
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

  return c.json(toMediaResponse(result), 200);
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

  return c.json(toMediaResponse(result), 200);
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

export default media;
