import { User } from '@joka/core/src/model/User';
import { z } from 'zod';

import { TokenPair } from './TokenPair';

interface ConstructorParameters {
  user: User;
  tokenPair: TokenPair;
}

export class AdmissionTicket {
  static from(params: ConstructorParameters): AdmissionTicket {
    const ticket = new AdmissionTicket(params.user, params.tokenPair);

    AdmissionTicket.Schema.parse(ticket.data);

    return ticket;
  }

  static get Schema() {
    return z.object({
      user: User.Schema,
      tokenPair: TokenPair.Schema,
    });
  }

  private constructor(
    public readonly user: User,
    public readonly tokenPair: TokenPair,
  ) {}

  get data() {
    const ticket = {
      user: this.user.data,
      tokenPair: this.tokenPair.data,
    };

    AdmissionTicket.Schema.parse(ticket);

    return ticket;
  }
}
