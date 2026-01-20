import { z } from 'zod';

export class Email {
  static from(email: unknown): Email {
    Email.Schema.parse(email);

    return new Email(email as string);
  }

  static get Schema() {
    return z.email();
  }

  constructor(public readonly value: string) {}
}

export type EmailInput = z.infer<typeof Email.Schema>;
