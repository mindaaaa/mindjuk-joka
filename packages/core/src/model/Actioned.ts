import { z } from 'zod';

import { User } from './User';

interface ConstructorParameters {
  at: Date | string | number;
  by: User;
}

export class Actioned {
  static from(params: ConstructorParameters): Actioned {
    const { at, by } = params;
    const actioned = new Actioned(new Date(at), by);

    Actioned.Schema.parse(actioned.data);

    return actioned;
  }

  static get Schema() {
    return z.object({
      at: z.date(),
      by: User.Schema,
    });
  }

  private constructor(
    public readonly at: Date,
    public readonly by: User,
  ) {}

  get data() {
    const actioned = {
      ...this,
      by: this.by.data,
    };

    Actioned.Schema.parse(actioned);

    return actioned;
  }
}
