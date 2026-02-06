import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { Hono } from 'hono';

import { CreateMedia, GetMedia } from '../../../application/use-case';

const media = new Hono().basePath('/v1/media');

const getMockContext = () => ({
  album: Album.from({
    id: 1,
    cid: '7b799ad4-41b5-4f66-ba7c-b6f148f64f00',
    name: 'dev',
    description: 'for test',
    isDeleted: false,
  }),
  user: User.from({
    id: 1,
    cid: 'efbef729-c015-437e-a8ff-72e77f589038',
    name: 'tester',
    email: 'tester@naver.com',
  }),
});

media.post('/', async (c) => {
  const body = await c.req.json();
  const description = body.description;

  const result = await CreateMedia.invoke({ ...getMockContext(), description });

  return c.json(result.data, 201, {
    'Content-Type': 'application/json',
  });
});

media.get('/:cid', async (c) => {
  const mediaCid = c.req.param('cid');

  const result = await GetMedia.invoke({ ...getMockContext(), mediaCid });

  return c.json(result.data, 200, {
    'Content-Type': 'application/json',
  });
});

export default media;
