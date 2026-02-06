import { Hono } from 'hono';

import me from './infrastructure/web/v1/me.controller';
import media from './infrastructure/web/v1/media.controller';

const app = new Hono().basePath('/api');

app.route('/', me);
app.route('/', media);

export default {
  fetch: app.fetch,
};
