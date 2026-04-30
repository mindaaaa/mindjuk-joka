import { UseCase } from './UseCase';
import { Actor } from '../model/Actor';

const UseCaseName = 'DeleteMedia' as const;

export interface Request {
  actor: Actor;
  mediaCid: string;
}

export type Response = null;

export abstract class DeleteMedia implements UseCase<Request, Response> {
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Response>;
}
