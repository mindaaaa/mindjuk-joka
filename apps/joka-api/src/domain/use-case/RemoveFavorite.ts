import { Actor } from '@joka/domain-actor/src/domain/Actor';

import { UseCase } from './UseCase';

const UseCaseName = 'RemoveFavorite' as const;

export interface Request {
  actor: Actor;
  mediaCid: string;
}

export type Response = null;

export abstract class RemoveFavorite implements UseCase<Request, Response> {
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Response>;
}
