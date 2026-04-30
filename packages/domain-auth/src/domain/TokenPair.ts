import { z } from 'zod';

interface ConstructorParameters {
  accessToken: string;
  refreshToken: string;
}

export class TokenPair {
  static from(params: ConstructorParameters): TokenPair {
    const pair = new TokenPair(params.accessToken, params.refreshToken);

    TokenPair.Schema.parse(pair.data);

    return pair;
  }

  static get Schema() {
    return z.object({
      accessToken: z.string().min(1),
      refreshToken: z.string().min(1),
    });
  }

  private constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {}

  get data() {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    };
  }
}
