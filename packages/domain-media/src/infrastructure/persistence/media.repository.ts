import { NotFoundException } from '@joka/core/src/exception';
import { eq, and } from 'drizzle-orm';

import { db } from './database';
import { media, contents, thumbnails } from './database/schema';
import { Media, DraftMedia } from '../../domain/Media';

export const insert = async (draft: DraftMedia): Promise<Media> => {
  const [persisted] = await db
    .insert(media)
    .values({
      albumId: draft.albumId,
      description: draft.description,
      state: draft.state,
      createdAt: draft.created.at,
      createdById: draft.created.by.id,
      updatedAt: draft.updated.at,
      updatedById: draft.updated.by.id,
    })
    .returning();

  return Media.from({
    id: persisted.id,
    cid: persisted.cid,
    albumId: draft.albumId,
    description: draft.description,
    state: draft.state,
    content: draft.content,
    isFavorite: draft.isFavorite,
    created: draft.created.data,
    updated: draft.updated.data,
  });
};

export const update = (target: Media): Promise<Media> => {
  return db.transaction(async (trx) => {
    const mediaRows = await trx
      .select({
        mediaId: media.id,
      })
      .from(media)
      .where(and(eq(media.id, target.id), eq(media.albumId, target.albumId)))
      .limit(1);
    if (!mediaRows.length) {
      throw new NotFoundException('MEDIA_NOT_FOUND', [
        `Media(${target.cid})가 존재하지 않습니다.`,
      ]);
    }

    return target;
  });
};

export const deleteOne = (target: Media): Promise<null> => {
  return db.transaction(async (trx) => {
    const mediaRows = await trx
      .select({
        mediaId: media.id,
      })
      .from(media)
      .where(and(eq(media.id, target.id), eq(media.albumId, target.albumId)))
      .limit(1);
    if (!mediaRows.length) {
      throw new NotFoundException('MEDIA_NOT_FOUND', [
        `Media(${target.cid})가 존재하지 않습니다.`,
      ]);
    }

    const [contentRow] = await trx
      .select({
        contentId: contents.id,
      })
      .from(contents)
      .where(eq(contents.mediaId, target.id))
      .limit(1);

    if (contentRow?.contentId) {
      await trx
        .delete(thumbnails)
        .where(eq(thumbnails.contentId, contentRow?.contentId));
      await trx.delete(contents).where(eq(contents.id, contentRow?.contentId));
    }

    await trx.delete(media).where(eq(media.id, target.id));

    return null;
  });
};
