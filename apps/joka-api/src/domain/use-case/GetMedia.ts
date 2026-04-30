import { Media } from '@joka/domain-media/src/domain/Media';

import { UseCase } from './UseCase';
import { Actor } from '../model/Actor';

const UseCaseName = 'GetMedia' as const;

export interface Request {
  actor: Actor;
  mediaCid: string;
}

export type Response = Media;

export abstract class GetMedia implements UseCase<Request, Response> {
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Media>;
}
