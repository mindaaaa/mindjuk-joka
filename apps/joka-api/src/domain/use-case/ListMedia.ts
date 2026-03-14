import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { Nullable } from '@joka/core/src/type';
import { Media } from '@joka/domain-media/src/domain/Media';

import { UseCase } from './UseCase';

const UseCaseName = 'ListMedia' as const;

export interface Request {
  album: Album;
  user: User;
  size?: string;
  order?: string;
  cursor?: string;
  states?: string;
}

export type Response = {
  items: Media[];
  pagination: {
    size: number;
    order: string;
    nextCursor: Nullable<string>;
    hasNext: boolean;
  };
};

export abstract class ListMedia implements UseCase<Request, Response> {
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Response>;
}
