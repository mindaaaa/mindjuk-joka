import {
  ConflictException,
  NotFoundException,
  UncaughtException,
} from '@joka/core/src/exception';
import { Actioned } from '@joka/core/src/model/Actioned';
import ClientFactory from '@joka/lib-drizzle/src/client';
import * as Schema from '@joka/lib-drizzle/src/schema';
import {
  eq,
  and,
  desc,
  asc,
  inArray,
  aliasedTable,
  lte,
  gte,
  SQL,
  sql,
} from 'drizzle-orm';

import { Content } from '../../domain/Content';
import { ListMediaCondition } from '../../domain/ListMediaCondition';
import { Media, DraftMedia } from '../../domain/Media';
import { Thumbnail } from '../../domain/Thumbnail';

const { media, contents, thumbnails, users, mediaFavorites } = Schema;

export class MediaRepository {
  constructor() {}

  async insert(draft: DraftMedia): Promise<Media> {
    const [persisted] = await this.connection
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
  }

  private get connection() {
    return ClientFactory.createInstance();
  }

  async findMany(condition: ListMediaCondition): Promise<{
    items: Media[];
    nextCursor: { cid: string } | null;
  }> {
    const whereClause: SQL<unknown>[] = [
      eq(media.albumId, condition.filter.albumId),
    ];
    if (condition.filter.states.length) {
      whereClause.push(inArray(media.state, condition.filter.states));
    }
    if (condition.cursor) {
      whereClause.push(
        condition.hasDescendingOrder
          ? lte(media.cid, condition.cursor.cid)
          : gte(media.cid, condition.cursor.cid),
      );
    }

    const responses = await this.selectAndJoinClause(condition.filter.userId)
      .where(and(...whereClause))
      .orderBy(condition.hasDescendingOrder ? desc(media.cid) : asc(media.cid))
      .limit(condition.adjustedLimit);

    if (responses.length <= condition.limit) {
      return {
        items: responses.map(this.refine),
        nextCursor: null,
      };
    }

    const nextOne = responses.pop()!;
    return {
      items: responses.map(this.refine),
      nextCursor: {
        cid: nextOne.cid,
      },
    };
  }

  private selectAndJoinClause(userId?: number) {
    const u1 = aliasedTable(users, 'u1');
    const u2 = aliasedTable(users, 'u2');

    return this.connection
      .select({
        id: media.id,
        cid: media.cid,
        albumId: media.albumId,
        description: media.description,
        state: media.state,
        version: media.version,
        isFavorite: sql<boolean>`${mediaFavorites.id} is not null`,
        contentUrl: contents.url,
        contentSize: contents.size,
        contentETag: contents.eTag,
        contentMimeType: contents.mimeType,
        thumbnailUrl: thumbnails.url,
        thumbnailSize: thumbnails.size,
        thumbnailETag: thumbnails.eTag,
        thumbnailMimeType: thumbnails.mimeType,
        thumbnailBlurhash: thumbnails.blurhash,
        createdAt: media.createdAt,
        createdById: u1.id,
        createdByCId: u1.cid,
        createdByName: u1.name,
        createdByEmail: u1.email,
        updatedAt: media.updatedAt,
        updatedById: u2.id,
        updatedByCId: u2.cid,
        updatedByName: u2.name,
        updatedByEmail: u2.email,
      })
      .from(media)
      .leftJoin(contents, eq(contents.mediaId, media.id))
      .leftJoin(thumbnails, eq(thumbnails.contentId, contents.id))
      .leftJoin(u1, eq(u1.id, media.createdById))
      .leftJoin(u2, eq(u2.id, media.updatedById))
      .leftJoin(
        mediaFavorites,
        userId
          ? and(
              eq(mediaFavorites.mediaId, media.id),
              eq(mediaFavorites.createdById, userId),
            )
          : sql`false`,
      );
  }

  // 상특: any를 쓰는데 거리낌이 없음
  private refine(media: any): Media {
    const thumbnail = media?.thumbnailUrl
      ? Thumbnail.from({
          url: media.thumbnailUrl,
          size: media.thumbnailSize,
          eTag: media.thumbnailETag,
          mimeType: media.thumbnailMimeType,
          blurhash: media.thumbnailBlurhash,
        })
      : null;
    const content = media?.contentUrl
      ? Content.from({
          url: media.contentUrl,
          size: media.contentSize,
          eTag: media.contentETag,
          mimeType: media.contentMimeType,
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
      isFavorite: !!media.isFavorite,
      created: {
        at: media.createdAt,
        by: {
          id: media.createdById,
          cid: media.createdByCId,
          name: media.createdByName,
          email: media.createdByEmail,
        },
      },
      updated: {
        at: media.updatedAt,
        by: {
          id: media.updatedById,
          cid: media.updatedByCId,
          name: media.updatedByName,
          email: media.updatedByEmail,
        },
      },
    });
  }

  async findOneOrNull(
    albumId: number,
    userId: number,
    cid: string,
  ): Promise<Media | null> {
    const [found] = await this.selectAndJoinClause(userId)
      // TODO: album 삭제 여부는 서비스 단에서 처리할 것!
      .where(and(eq(media.cid, cid), eq(media.albumId, albumId)));

    return found ? this.refine(found) : null;
  }

  async findOne(albumId: number, userId: number, cid: string): Promise<Media> {
    const media = await this.findOneOrNull(albumId, userId, cid);
    if (!media) {
      throw new NotFoundException('MEDIA_NOT_FOUND', [
        `Media(${cid})가 존재하지 않습니다.`,
      ]);
    }

    return media;
  }

  // 시스템 전용: media.cid가 전역 유일하므로 album 무관하게 조회한다.
  async findByCid(cid: string): Promise<Media> {
    const [found] = await this.selectAndJoinClause().where(eq(media.cid, cid));
    if (!found) {
      throw new NotFoundException('MEDIA_NOT_FOUND', [
        `Media(${cid})가 존재하지 않습니다.`,
      ]);
    }

    return this.refine(found);
  }

  async update(target: Media): Promise<Media> {
    return this.connection.transaction(async (trx) => {
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
          await trx
            .delete(contents)
            .where(eq(contents.id, persistedContent.id));
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
          url: target.content!.url.fullPath,
          size: target.content!.size,
          eTag: target.content!.eTag,
          mimeType: target.content!.mimeType!.value,
        })
        .onConflictDoUpdate({
          target: contents.mediaId,
          set: {
            url: target.content!.url.fullPath,
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
            url: target.content!.thumbnail!.url.fullPath,
            size: target.content!.thumbnail!.size,
            eTag: target.content!.thumbnail!.eTag,
            mimeType: target.content!.thumbnail!.mimeType!.value,
            blurhash: target.content!.thumbnail!.blurhash,
          })
          .onConflictDoUpdate({
            target: thumbnails.contentId,
            set: {
              url: target.content!.thumbnail!.url.fullPath,
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
  }

  async deleteOne(target: Media): Promise<null> {
    return this.connection.transaction(async (trx) => {
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
        await trx
          .delete(contents)
          .where(eq(contents.id, contentRow?.contentId));
      }

      await trx
        .delete(mediaFavorites)
        .where(eq(mediaFavorites.mediaId, target.id));

      const [deleted] = await trx
        .delete(media)
        .where(
          and(
            eq(media.albumId, target.albumId),
            eq(media.cid, target.cid),
            eq(media.version, target.version),
          ),
        )
        .returning();
      if (!deleted) {
        throw new ConflictException('MEDIA_VERSION_MISMATCHED', [
          `Media(${target.cid}) 수정에 실패했습니다.`,
          `데이터가 이미 수정되었거나 존재하지 않습니다.`,
        ]);
      }

      return null;
    });
  }
}
