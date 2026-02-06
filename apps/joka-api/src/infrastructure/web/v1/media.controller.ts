import { Hono } from 'hono';

const media = new Hono().basePath('/v1/media');

media.post('/', (c) => {
  console.log(JSON.stringify(c, null, 2));
  return c.text('Crate Media');
});

media.get('/:cid', (c) => {
  console.log(JSON.stringify(c, null, 2));
  return c.text('Get Media');
});

export default media;
