import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { Actor } from '@joka/domain-actor/src/domain/Actor';

// Actor는 album / user / role의 조합으로 user는 절대 변하지 않고 Actor의 권한도 변경되지 않을 것을 기대한 캐싱
export class ActorCache {
  static serialize(actor: Actor): string {
    // traceId는 요청마다 재생성되는 값이라 저장하지 않음
    return JSON.stringify({
      album: actor.album.data,
      user: actor.user.data,
      role: actor.role,
    });
  }

  static deserialize(json: string): Actor | null {
    try {
      const parsed = JSON.parse(json);
      return Actor.from({
        album: Album.from(parsed.album),
        user: User.from(parsed.user),
        role: parsed.role,
      });
    } catch (e) {
      // 저장된 캐시 값에 대한 파싱 실패
      console.warn('ActorCache.deserialize failed:', e);
      return null;
    }
  }

  static key(userCid: string, albumCid: string): Request {
    return new Request(
      `https://actor-cache.joka/v1/actor/${userCid}/${albumCid}`,
    );
  }

  static async get(
    cache: Cache,
    userCid: string,
    albumCid: string,
  ): Promise<Actor | null> {
    try {
      const res = await cache.match(this.key(userCid, albumCid));
      if (!res) {
        return null;
      }
      return this.deserialize(await res.text());
    } catch (e) {
      console.warn('ActorCache.get failed:', e);
      return null;
    }
  }

  static async set(
    cache: Cache,
    actor: Actor,
    userCid: string,
    albumCid: string,
  ): Promise<void> {
    try {
      const res = new Response(this.serialize(actor), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300',
        },
      });
      await cache.put(this.key(userCid, albumCid), res);
    } catch (e) {
      // 캐시 저장 실패는 무시
      console.warn('ActorCache.set failed:', e);
    }
  }
}
