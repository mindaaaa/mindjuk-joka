import { z } from 'zod';

import { Email } from './Email';

interface ConstructorParameters {
  id: number;
  cid: string;
  name: string;
  email: string;
}

export class DraftUser {
  static from(
    params: Omit<ConstructorParameters, 'id' | 'cid'> & { provider: string },
  ): DraftUser {
    const email = Email.from(params.email);
    const draft = new DraftUser(params.name, email, params.provider);

    DraftUser.Schema.parse(draft);

    return draft;
  }

  static get Schema() {
    return z.object({
      name: z.string().min(1),
      email: Email.Schema,
      provider: z.string().min(1),
    });
  }

  private constructor(
    public readonly name: string,
    public readonly email: Email,
    public readonly provider: string,
  ) {}

  get data() {
    const draft = {
      ...this,
      email: this.email.value,
    };

    DraftUser.Schema.parse(draft);

    return draft;
  }
}

export class User {
  static from(params: ConstructorParameters): User {
    User.Schema.parse(params);

    return new User(
      params.id,
      params.cid,
      params.name,
      Email.from(params.email),
    );
  }

  static get Schema() {
    return z.object({
      id: z.number().positive(),
      cid: z.string().min(1),
      name: z.string().min(1),
      email: Email.Schema,
    });
  }

  private constructor(
    public readonly id: number,
    public readonly cid: string,
    public readonly name: string,
    public readonly email: Email,
  ) {}

  get data() {
    const user = {
      ...this,
      email: this.email.value,
    };

    User.Schema.parse(user);

    return user;
  }
}

export type UserInput = z.infer<typeof User.Schema>;
