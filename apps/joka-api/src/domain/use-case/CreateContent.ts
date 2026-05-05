import { Actor } from '@joka/domain-actor/src/domain/Actor';
import { Content } from '@joka/domain-media/src/domain/Content';

import { UseCase } from './UseCase';

const UseCaseName = 'CreateContent' as const;

export interface Request {
  actor: Actor;
  mediaCid: string;
  url: string;
}

export type Response = Content;

export abstract class CreateContent implements UseCase<Request, Response> {
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Response>;
}
