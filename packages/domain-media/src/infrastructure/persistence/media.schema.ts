import { relations } from 'drizzle-orm';
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

import { Media } from '../../domain/Media';

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
    userRolesFk1: foreignKey({
      columns: [t.userId],
      foreignColumns: [users.id],
      name: 'user_roles_fk_1',
    }).onDelete('cascade'),

    userRolesFk2: foreignKey({
      columns: [t.albumId],
      foreignColumns: [albums.id],
      name: 'user_roles_fk_2',
    }).onDelete('cascade'),

    userRolesUq1: unique('user_roles_uq_1').on(t.userId, t.albumId),
  }),
);

export const media = jokaSchema.table(
  'media',
  {
    id: serial('id').primaryKey(),
    cid: uuid('cid')
      .$defaultFn(() => uuidv7())
      .unique()
      .notNull(),
    albumId: integer('album_id').notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    state: varchar('state', { length: 20 })
      .default(Media.State.DRAFT)
      .notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdById: integer('created_by_id').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    updatedById: integer('updated_by_id').notNull(),
  },
  (t) => ({
    mediaAlbumFk: foreignKey({
      columns: [t.albumId],
      foreignColumns: [albums.id],
      name: 'media_album_id_fk',
    }),
    mediaCreatedByFk: foreignKey({
      columns: [t.createdById],
      foreignColumns: [users.id],
      name: 'media_created_by_fk',
    }),
    mediaUpdatedByFk: foreignKey({
      columns: [t.updatedById],
      foreignColumns: [users.id],
      name: 'media_updated_by_fk',
    }),
  }),
);

export const contents = jokaSchema.table(
  'contents',
  {
    id: serial('id').primaryKey(),
    cid: uuid('cid')
      .$defaultFn(() => uuidv7())
      .unique()
      .notNull(),
    mediaId: integer('media_id').notNull().unique(),
    url: varchar('url', { length: 1024 }).notNull(),
    size: integer('size').notNull(),
    eTag: varchar('eTag', { length: 100 }).notNull(),
    mimeType: varchar('mimeType', { length: 100 }).notNull(),
  },
  (t) => ({
    contentsMediaFk: foreignKey({
      columns: [t.mediaId],
      foreignColumns: [media.id],
      name: 'contents_media_id_fk',
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
    contentId: integer('content_id').notNull().unique(),
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

// TODO: 얘네 필요함?
/** Relations */
export const mediaRelations = relations(media, ({ one }) => ({
  album: one(albums, {
    fields: [media.albumId],
    references: [albums.id],
  }),
  content: one(contents, {
    fields: [media.id],
    references: [contents.mediaId],
  }),
  createdBy: one(users, {
    fields: [media.createdById],
    references: [users.id],
    relationName: 'media_creator',
  }),
  updatedBy: one(users, {
    fields: [media.updatedById],
    references: [users.id],
    relationName: 'media_updater',
  }),
}));

export const contentsRelations = relations(contents, ({ one }) => ({
  media: one(media, {
    fields: [contents.mediaId],
    references: [media.id],
  }),
  thumbnail: one(thumbnails, {
    fields: [contents.id],
    references: [thumbnails.contentId],
  }),
}));

export const thumbnailsRelations = relations(thumbnails, ({ one }) => ({
  content: one(contents, {
    fields: [thumbnails.contentId],
    references: [contents.id],
  }),
}));

export const albumsRelations = relations(albums, ({ many }) => ({
  media: many(media, { relationName: 'media_album' }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  createdMedia: many(media, { relationName: 'media_creator' }),
  updatedMedia: many(media, { relationName: 'media_updater' }),
}));
