import { Email } from '@joka/core/src/model/Email';
import { DraftUser, User } from '@joka/core/src/model/User';
import ClientFactory from '@joka/lib-drizzle/src/client';
import * as Schema from '@joka/lib-drizzle/src/schema';
import { eq, and } from 'drizzle-orm';

const { users } = Schema;

export class UserRepository {
  async insert(draft: DraftUser): Promise<User> {
    const { name, email, provider } = draft.data;
    const [persisted] = await this.connection
      .insert(users)
      .values({ name, email, provider })
      .returning();

    return User.from({
      id: persisted.id,
      cid: persisted.cid,
      name: persisted.name,
      email: persisted.email,
    });
  }

  private get connection() {
    return ClientFactory.createInstance();
  }

  private get readConnection() {
    return ClientFactory.createReadInstance();
  }

  async findByCid(cid: string): Promise<User | null> {
    const [found] = await this.readConnection
      .select({
        id: users.id,
        cid: users.cid,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.cid, cid)))
      .limit(1);

    return found ? User.from(found) : null;
  }

  async findByEmailAndProvider(
    email: Email,
    provider: string,
  ): Promise<User | null> {
    const [found] = await this.readConnection
      .select({
        id: users.id,
        cid: users.cid,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.email, email.value),
          eq(users.provider, provider),
          eq(users.isDeleted, false),
        ),
      )
      .limit(1);

    return found ? User.from(found) : null;
  }

  async updateLastAccessedAt(user: User): Promise<null> {
    await this.connection
      .update(users)
      .set({ lastAccessedAt: new Date() })
      .where(eq(users.id, user.id));

    return null;
  }
}
