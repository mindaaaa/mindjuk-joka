import { z } from 'zod';

import { Email } from './Email';

interface ConstructorParameters {
  id: number;
  cid: string;
  name: string;
  email: string;
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
