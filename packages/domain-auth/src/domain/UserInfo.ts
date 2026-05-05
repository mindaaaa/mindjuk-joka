import { Email } from '@joka/core/src/model/Email';
import { z } from 'zod';

const SupportedProvider = {
  KAKAO: 'KAKAO',
} as const;

interface ConstructorParameters {
  id: string | number;
  email: Email;
  name: string;
  provider: keyof typeof SupportedProvider;
}

export class UserInfo {
  static from(params: ConstructorParameters): UserInfo {
    const userInfo = new UserInfo(
      params.id,
      params.email,
      params.name,
      params.provider,
    );

    UserInfo.Schema.parse(userInfo.data);

    return userInfo;
  }

  static get Schema() {
    return z.object({
      id: z.union([z.string(), z.number()]),
      email: Email.Schema,
      name: z.string().min(1),
      provider: z.enum(Object.values(SupportedProvider)),
    });
  }

  private constructor(
    public readonly id: string | number,
    public readonly email: Email,
    public readonly name: string,
    public readonly provider: keyof typeof SupportedProvider,
  ) {}

  get data() {
    const userInfo = {
      ...this,
      email: this.email.value,
    };

    UserInfo.Schema.parse(userInfo);

    return userInfo;
  }
}
