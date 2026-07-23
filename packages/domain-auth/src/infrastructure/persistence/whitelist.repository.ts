import ClientFactory from '@joka/lib-drizzle/src/client';
import * as Schema from '@joka/lib-drizzle/src/schema';
import { eq } from 'drizzle-orm';

const { userWhitelists } = Schema;

export class WhitelistRepository {
  async isAllowed(email: string): Promise<boolean> {
    const [found] = await this.connection
      .select({ email: userWhitelists.email })
      .from(userWhitelists)
      .where(eq(userWhitelists.email, email))
      .limit(1);

    return !!found;
  }

  private get connection() {
    return ClientFactory.createReadInstance();
  }
}
