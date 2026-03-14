import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';

const Role = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const;

const ROLE_HIERARCHY: (keyof typeof Role)[] = ['VIEWER', 'EDITOR', 'ADMIN'];

interface ConstructorParameters {
  album: Album;
  user: User;
  role: keyof typeof Role;
}

export class Actor {
  static from(params: ConstructorParameters): Actor {
    const traceId = uuidv7();

    const actor = new Actor(traceId, params.album, params.user, params.role);

    Actor.Schema.parse(actor.data);

    return actor;
  }

  static get Schema() {
    return z.object({
      traceId: z.string().uuid(),
      album: Album.Schema,
      user: User.Schema,
      role: z.enum(Object.keys(Role)),
    });
  }

  private constructor(
    public readonly traceId: string,
    public readonly album: Album,
    public readonly user: User,
    public readonly role: keyof typeof Role,
  ) {}

  isAdmin(): boolean {
    return this.roleLevel >= ROLE_HIERARCHY.indexOf(Role.ADMIN);
  }

  canEdit(): boolean {
    return this.roleLevel >= ROLE_HIERARCHY.indexOf(Role.EDITOR);
  }

  canRead(): boolean {
    return this.roleLevel >= ROLE_HIERARCHY.indexOf(Role.VIEWER);
  }

  private get roleLevel(): number {
    return ROLE_HIERARCHY.indexOf(this.role);
  }

  get data() {
    return {
      traceId: this.traceId,
      album: this.album.data,
      user: this.user.data,
      role: this.role,
    };
  }
}
