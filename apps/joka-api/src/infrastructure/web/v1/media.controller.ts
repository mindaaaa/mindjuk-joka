import { Hono } from 'hono';

import type { CloudflareEnv } from '../../../application/model';
import {
  CreateMedia,
  GetMedia,
  ListMedia,
} from '../../../application/use-case';

const media = new Hono<CloudflareEnv>().basePath('/v1/media');

media.post('/', async (c) => {
  const body = await c.req.json();
  const description = body.description;
  const actor = c.get('actor');

  const result = await CreateMedia.invoke({
    album: actor.album,
    user: actor.user,
    description,
  });

  return c.json(result.data, 201, {
    'Content-Type': 'application/json',
  });
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
    album: actor.album,
    user: actor.user,
    ...invokeRequest,
  });

  return c.json(
    {
      items: result.items.map((item) => item.data),
      pagination: result.pagination,
    },
    200,
    { 'Content-Type': 'application/json' },
  );
});

media.get('/:cid', async (c) => {
  const mediaCid = c.req.param('cid');
  const actor = c.get('actor');

  const result = await GetMedia.invoke({
    album: actor.album,
    user: actor.user,
    mediaCid,
  });

  return c.json(result.data, 200, {
    'Content-Type': 'application/json',
  });
});

export default media;
