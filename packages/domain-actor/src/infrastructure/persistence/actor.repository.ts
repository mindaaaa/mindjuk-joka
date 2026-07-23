import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import ClientFactory from '@joka/lib-drizzle/src/client';
import * as Schema from '@joka/lib-drizzle/src/schema';
import { eq, and, desc, asc, lte, gte, SQL } from 'drizzle-orm';

import { Actor } from '../../domain/Actor';
import { ListActorsCondition } from '../../domain/ListActorsCondition';

const { albums, userRoles, users } = Schema;

export class ActorRepository {
  constructor() {}

  async findOneOrNull(
    userCid: string,
    albumCid: string,
  ): Promise<Actor | null> {
    const [found] = await this.connection
      .select({
        id: albums.id,
        cid: albums.cid,
        name: albums.name,
        description: albums.description,
        isDeleted: albums.isDeleted,

        userId: users.id,
        userCid: users.cid,
        userName: users.name,
        userEmail: users.email,

        role: userRoles.role,
      })
      .from(albums)
      .innerJoin(userRoles, eq(userRoles.albumId, albums.id))
      .innerJoin(users, eq(users.id, userRoles.userId))
      .where(
        and(
          eq(users.cid, userCid),
          eq(albums.cid, albumCid),
          eq(albums.isDeleted, false),
        ),
      )
      .limit(1);

    return found ? this.refine(found) : null;
  }

  async findMany(condition: ListActorsCondition): Promise<{
    items: Actor[];
    nextCursor: { cid: string } | null;
  }> {
    const whereClause: SQL<unknown>[] = [
      eq(users.id, condition.filter.userId),
      eq(albums.isDeleted, false),
    ];
    if (condition.cursor) {
      whereClause.push(
        condition.hasDescendingOrder
          ? lte(albums.cid, condition.cursor.cid)
          : gte(albums.cid, condition.cursor.cid),
      );
    }

    const responses = await this.connection
      .select({
        id: albums.id,
        cid: albums.cid,
        name: albums.name,
        description: albums.description,
        isDeleted: albums.isDeleted,

        userId: users.id,
        userCid: users.cid,
        userName: users.name,
        userEmail: users.email,

        role: userRoles.role,
      })
      .from(albums)
      .innerJoin(userRoles, eq(userRoles.albumId, albums.id))
      .innerJoin(users, eq(users.id, userRoles.userId))
      .where(and(...whereClause))
      .orderBy(
        condition.hasDescendingOrder ? desc(albums.cid) : asc(albums.cid),
      )
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

  private get connection() {
    return ClientFactory.createReadInstance();
  }

  private refine(actor: any): Actor {
    const album = Album.from({
      id: actor.id,
      cid: actor.cid,
      name: actor.name,
      description: actor.description,
      isDeleted: actor.isDeleted,
    });
    const user = User.from({
      id: actor.userId,
      cid: actor.userCid,
      name: actor.userName,
      email: actor.userEmail,
    });

    return Actor.from({
      album,
      user,
      role: actor.role,
    });
  }
}
