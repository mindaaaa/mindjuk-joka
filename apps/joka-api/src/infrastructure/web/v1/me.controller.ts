import { Hono } from 'hono';

const me = new Hono().basePath('/v1/me');

me.get('/', (c) => {
  console.log(JSON.stringify(c, null, 2));
  return c.text('Get Me');
});

export default me;
