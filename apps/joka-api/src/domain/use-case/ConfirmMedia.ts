import { Media } from '@joka/domain-media/src/domain/Media';

import { UseCase } from './UseCase';
import { Actor } from '../model/Actor';

const UseCaseName = 'ConfirmMedia' as const;

export interface Request {
  actor: Actor;
  mediaCid: string;
}

export type Response = Media;

export abstract class ConfirmMedia implements UseCase<Request, Response> {
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Response>;
}
