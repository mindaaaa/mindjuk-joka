import {
  pgSchema,
  serial,
  varchar,
  boolean,
  timestamp,
  integer,
  unique,
  foreignKey,
  uuid,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

import { Media } from '../../../domain/Media';

export const jokaSchema = pgSchema('joka');

export const users = jokaSchema.table('users', {
  id: serial('id').primaryKey(),
  cid: uuid('cid')
    .$defaultFn(() => uuidv7())
    .unique()
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 20 }).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
});

export const albums = jokaSchema.table('albums', {
  id: serial('id').primaryKey(),
  cid: uuid('cid')
    .$defaultFn(() => uuidv7())
    .unique()
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1024 }),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userRoles = jokaSchema.table(
  'user_roles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    albumId: integer('album_id').notNull(),
    role: varchar('role', { length: 20 }).default('VIEWER').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    // SQL의 constraint user_roles_fk_1 반영
    userRolesFk1: foreignKey({
      columns: [t.userId],
      foreignColumns: [users.id],
      name: 'user_roles_fk_1',
    }).onDelete('cascade'),

    // SQL의 constraint user_roles_fk_2 반영
    userRolesFk2: foreignKey({
      columns: [t.albumId],
      foreignColumns: [albums.id],
      name: 'user_roles_fk_2',
    }).onDelete('cascade'),

    // SQL의 constraint user_roles_uq_1 반영
    userRolesUq1: unique('user_roles_uq_1').on(t.userId, t.albumId),
  }),
);

export const media = jokaSchema.table('media', {
  id: serial('id').primaryKey(),
  cid: uuid('cid')
    .$defaultFn(() => uuidv7())
    .unique()
    .notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  state: varchar('state', { length: 20 }).default(Media.State.DRAFT).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdById: integer('created_by_id').notNull(), // 여기에 users.id FK가 필요하다면 추가 가능!
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contents = jokaSchema.table(
  'contents',
  {
    id: serial('id').primaryKey(),
    cid: uuid('cid')
      .$defaultFn(() => uuidv7())
      .unique()
      .notNull(),
    mediaId: integer('media_id').notNull(),
    url: varchar('url', { length: 1024 }).notNull(),
    size: integer('size').notNull(),
    eTag: varchar('eTag', { length: 100 }).notNull(),
    mimeType: varchar('mimeType', { length: 100 }).notNull(),
  },
  (t) => ({
    contentsMediaFk: foreignKey({
      columns: [t.mediaId],
      foreignColumns: [media.id],
      name: 'contents_media_id_fk', // SQL 명세엔 없었지만 관례상 추가
    }),
  }),
);

export const thumbnails = jokaSchema.table(
  'thumbnails',
  {
    id: serial('id').primaryKey(),
    cid: uuid('cid')
      .$defaultFn(() => uuidv7())
      .unique()
      .notNull(),
    contentId: integer('content_id').notNull(),
    url: varchar('url', { length: 1024 }).notNull(),
    size: integer('size').notNull(),
    eTag: varchar('eTag', { length: 100 }).notNull(),
    mimeType: varchar('mimeType', { length: 100 }).notNull(),
    blurhash: varchar('blurhash', { length: 100 }).notNull(),
  },
  (t) => ({
    thumbnailsContentFk: foreignKey({
      columns: [t.contentId],
      foreignColumns: [contents.id],
      name: 'thumbnails_content_id_fk',
    }),
  }),
);
