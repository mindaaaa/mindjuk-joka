import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { Actor } from '@joka/domain-actor/src/domain/Actor';

import { ActorCache } from '../../../src/infrastructure/cache/actor.cache';

const makeActor = (): Actor =>
  Actor.from({
    album: Album.from({
      id: 1,
      cid: 'album-cid',
      name: '앨범',
      description: '설명',
      isDeleted: false,
    }),
    user: User.from({
      id: 2,
      cid: 'user-cid',
      name: '유저',
      email: 'a@b.com',
    }),
    role: 'ADMIN',
  });

describe('ActorCache 직렬화', () => {
  it('serialize → deserialize 라운드트립이 값을 보존한다', () => {
    const actor = makeActor();

    const restored = ActorCache.deserialize(ActorCache.serialize(actor));

    expect(restored).not.toBeNull();
    expect(restored!.album.cid).toBe('album-cid');
    expect(restored!.album.name).toBe('앨범');
    expect(restored!.user.cid).toBe('user-cid');
    expect(restored!.user.email.value).toBe('a@b.com');
    expect(restored!.role).toBe('ADMIN');
    expect(restored!.canRead()).toBe(true);
    expect(restored!.isAdmin()).toBe(true);
  });

  it('손상된 JSON은 null을 반환한다', () => {
    expect(ActorCache.deserialize('{not json')).toBeNull();
    expect(ActorCache.deserialize('{}')).toBeNull();
  });

  it('유효한 형태지만 잘못된 role은 null을 반환한다', () => {
    const payload = JSON.stringify({
      album: { id: 1, cid: 'a', name: 'n', description: 'd', isDeleted: false },
      user: { id: 2, cid: 'u', name: 'n', email: 'a@b.com' },
      role: 'SUPERUSER',
    });
    expect(ActorCache.deserialize(payload)).toBeNull();
  });
});

describe('ActorCache Cache API 래퍼', () => {
  const makeFakeCache = () => {
    const store = new Map<string, Response>();
    return {
      async match(req: Request): Promise<Response | undefined> {
        const hit = store.get(req.url);
        return hit ? hit.clone() : undefined;
      },
      async put(req: Request, res: Response): Promise<void> {
        store.set(req.url, res);
      },
    } as unknown as Cache;
  };

  it('set 후 get이 동일한 actor를 복원한다', async () => {
    const cache = makeFakeCache();
    const actor = makeActor();

    await ActorCache.set(cache, actor, 'user-cid', 'album-cid');
    const restored = await ActorCache.get(cache, 'user-cid', 'album-cid');

    expect(restored).not.toBeNull();
    expect(restored!.user.cid).toBe('user-cid');
    expect(restored!.album.cid).toBe('album-cid');
    expect(restored!.role).toBe('ADMIN');
  });

  it('저장되지 않은 키는 null을 반환한다', async () => {
    const cache = makeFakeCache();
    expect(await ActorCache.get(cache, 'x', 'y')).toBeNull();
  });

  it('key는 userCid/albumCid로 결정적 URL을 만든다', () => {
    expect(ActorCache.key('u', 'a').url).toBe(
      'https://actor-cache.joka/v1/actor/u/a',
    );
  });

  it('cache.match이 거부해도 get은 null을 반환한다', async () => {
    const cache = {
      async match(): Promise<Response | undefined> {
        throw new Error('Cache match failed');
      },
    } as unknown as Cache;

    const result = await ActorCache.get(cache, 'u', 'a');
    expect(result).toBeNull();
  });

  it('cache.put이 거부해도 set은 거부하지 않는다', async () => {
    const cache = {
      async put(): Promise<void> {
        throw new Error('Cache put failed');
      },
    } as unknown as Cache;

    const actor = makeActor();
    await expect(ActorCache.set(cache, actor, 'u', 'a')).resolves.toBeUndefined();
  });

  it('set이 쓴 Response의 헤더를 검증한다', async () => {
    const store = new Map<string, Response>();
    const cache = {
      async match(req: Request): Promise<Response | undefined> {
        const hit = store.get(req.url);
        return hit ? hit.clone() : undefined;
      },
      async put(req: Request, res: Response): Promise<void> {
        store.set(req.url, res);
      },
    } as unknown as Cache;

    const actor = makeActor();
    await ActorCache.set(cache, actor, 'user-cid', 'album-cid');

    const stored = store.get(ActorCache.key('user-cid', 'album-cid').url);
    expect(stored).not.toBeUndefined();
    expect(stored!.headers.get('Cache-Control')).toBe('max-age=300');
    expect(stored!.headers.get('Content-Type')).toBe('application/json');
  });
});
