import { Nullable } from '@joka/core/src/type';
import { Actor } from '@joka/domain-actor/src/domain/Actor';
import { Media } from '@joka/domain-media/src/domain/Media';

import { UseCase } from './UseCase';

const UseCaseName = 'ListMedia' as const;

export interface Request {
  actor: Actor;
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
