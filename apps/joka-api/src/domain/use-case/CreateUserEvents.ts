import { Actor } from '@joka/domain-actor/src/domain/Actor';
import { Payload } from '@joka/domain-user-event/src/domain/type';

import { UseCase } from './UseCase';

const UseCaseName = 'CreateUserEvents' as const;

export interface Request {
  actor: Actor;
  events: Payload[];
}

export type Response = null;

export abstract class CreateUserEvents implements UseCase<Request, Response> {
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Response>;
}
