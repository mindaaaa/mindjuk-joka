import {
  ConflictException,
  NotFoundException,
  UncaughtException,
} from '@joka/core/src/exception';
import { Actioned } from '@joka/core/src/model/Actioned';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';

import { db } from './database';
import { media, contents, thumbnails, albums } from './database/schema';
import { Content } from '../../domain/Content';
import { ListMediaCondition } from '../../domain/ListMediaCondition';
import { Media, DraftMedia } from '../../domain/Media';
import { Thumbnail } from '../../domain/Thumbnail';

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
    version: persisted.version,
    content: draft.content,
    isFavorite: draft.isFavorite,
    created: draft.created.data,
    updated: draft.updated.data,
  });
};

// 상특: any를 쓰는데 거리낌이 없음
const refine = (media: any): Media => {
  const thumbnail = media?.content?.thumbnail?.url
    ? Thumbnail.from({
        url: media.content.thumbnail.url,
        size: media.content.thumbnail.size,
        eTag: media.content.thumbnail.eTag,
        mimeType: media.content.thumbnail.mimeType,
        blurhash: media.content.thumbnail.blurhash,
      })
    : null;
  const content = media?.content?.url
    ? Content.from({
        url: media.content.url,
        size: media.content.size,
        eTag: media.content.eTag,
        mimeType: media.content.mimeType,
        thumbnail,
      }).data
    : null;

  return Media.from({
    id: media.id,
    cid: media.cid,
    albumId: media.albumId,
    description: media.description,
    state: media.state,
    version: media.version,
    content: content,
    isFavorite: false, // TODO: 추후 개선 필요
    created: {
      at: media.createdAt,
      by: {
        id: media.createdBy.id,
        cid: media.createdBy.cid,
        name: media.createdBy.name,
        email: media.createdBy.email,
      },
    },
    updated: {
      at: media.updatedAt,
      by: {
        id: media.updatedBy.id,
        cid: media.updatedBy.cid,
        name: media.updatedBy.name,
        email: media.updatedBy.email,
      },
    },
  });
};

export const findMany = async (
  _condition: ListMediaCondition,
): Promise<unknown> => {
  const responses = await db.query.media.findMany({
    where: (media, { lt, gt, and }) => {
      // TODO: 이게 먹히나 모르겠네...?
      const whereClause = _condition.filter.states.length
        ? [
            eq(media.albumId, _condition.filter.albumId),
            inArray(media.state, _condition.filter.states),
          ]
        : [eq(media.albumId, _condition.filter.albumId)];

      if (!_condition.cursor) {
        return and(...whereClause);
      } else if (_condition.hasDescendingOrder) {
        return and(lt(media.cid, _condition.cursor.cid), ...whereClause);
      } else {
        return and(gt(media.cid, _condition.cursor.cid), ...whereClause);
      }
    },
    limit: _condition.adjustedLimit,
    orderBy: [_condition.hasDescendingOrder ? desc(media.cid) : asc(media.cid)],
    with: {
      album: true,
      content: { with: { thumbnail: true } },
      createdBy: true,
      updatedBy: true,
    },
  });

  if (responses.length <= _condition.limit) {
    return {
      items: responses.map(refine),
      nextCursor: null,
    };
  }

  const nextOne = responses.pop()!;
  return {
    items: responses.map(refine),
    nextCursor: {
      cid: nextOne.cid,
    },
  };
};

export const findOne = async (albumId: number, cid: string): Promise<Media> => {
  const found = await db.query.media.findFirst({
    where: and(
      eq(media.cid, cid),
      eq(media.albumId, albumId),
      eq(albums.isDeleted, false),
    ),
    with: {
      album: true,
      content: {
        with: {
          thumbnail: true,
        },
      },
      createdBy: true,
      updatedBy: true,
    },
  });
  if (!found) {
    throw new NotFoundException('MEDIA_NOT_FOUND', [
      `Media(${cid})가 존재하지 않습니다.`,
    ]);
  }

  return refine(found);
};

export const update = (target: Media): Promise<Media> => {
  return db.transaction(async (trx) => {
    // 1. update media
    const [updated] = await trx
      .update(media)
      .set({
        description: target.description,
        state: target.state,
        updatedAt: new Date(),
        version: target.version + 1,
      })
      .where(
        and(
          eq(media.albumId, target.albumId),
          eq(media.cid, target.cid),
          eq(media.version, target.version),
        ),
      )
      .returning();
    if (!updated) {
      throw new ConflictException('MEDIA_VERSION_MISMATCHED', [
        `Media(${target.cid}) 수정에 실패했습니다.`,
        `데이터가 이미 수정되었거나 존재하지 않습니다.`,
      ]);
    }

    // 2. update content
    const persistedContent = await trx.query.contents.findFirst({
      where: eq(contents.mediaId, target.id),
      with: { thumbnail: true },
    });

    const shouldRemoveThumbnail =
      target.hasNoThumbnail && persistedContent?.thumbnail?.url;
    if (shouldRemoveThumbnail) {
      await trx
        .delete(thumbnails)
        .where(eq(thumbnails.contentId, persistedContent.id));
    }
    if (target.hasNoContent) {
      if (persistedContent) {
        await trx.delete(contents).where(eq(contents.id, persistedContent.id));
      }

      return target.setVersion(updated.version).setUpdated(
        Actioned.from({
          ...target.updated,
          at: updated.updatedAt,
        }),
      );
    }

    // 여기부턴 요청에 Content가 포함된 것임
    const [upsertedContent] = await trx
      .insert(contents)
      .values({
        mediaId: target.id,
        url: target.content!.url.path,
        size: target.content!.size,
        eTag: target.content!.eTag,
        mimeType: target.content!.mimeType!.value,
      })
      .onConflictDoUpdate({
        target: contents.mediaId,
        set: {
          url: target.content!.url.path,
          size: target.content!.size,
          eTag: target.content!.eTag,
          mimeType: target.content!.mimeType!.value,
        },
      })
      .returning();
    if (!upsertedContent) {
      throw new UncaughtException('FAILED_TO_UPSERT', [
        `Content 생성 또는 수정에 실패했습니다.`,
        `관리자에게 문의하세요.`,
      ]);
    }

    if (!target.hasNoThumbnail) {
      await trx
        .insert(thumbnails)
        .values({
          contentId: upsertedContent.id,
          url: target.content!.thumbnail!.url.path,
          size: target.content!.thumbnail!.size,
          eTag: target.content!.thumbnail!.eTag,
          mimeType: target.content!.thumbnail!.mimeType!.value,
          blurhash: target.content!.thumbnail!.blurhash,
        })
        .onConflictDoUpdate({
          target: thumbnails.contentId,
          set: {
            url: target.content!.thumbnail!.url.path,
            size: target.content!.thumbnail!.size,
            eTag: target.content!.thumbnail!.eTag,
            mimeType: target.content!.thumbnail!.mimeType!.value,
            blurhash: target.content!.thumbnail!.blurhash,
          },
        });
    }

    return target.setVersion(updated.version).setUpdated(
      Actioned.from({
        ...target.updated,
        at: updated.updatedAt,
      }),
    );
  });
};

export const deleteOne = (target: Media): Promise<null> => {
  return db.transaction(async (trx) => {
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

    const [deleted] = await trx
      .delete(media)
      .where(eq(media.id, target.id))
      .returning();
    if (!deleted) {
      throw new NotFoundException('MEDIA_NOT_FOUND', [
        `Media(${target.cid})가 존재하지 않습니다.`,
      ]);
    }

    return null;
  });
};
