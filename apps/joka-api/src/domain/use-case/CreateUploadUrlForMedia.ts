import { UseCase } from './UseCase';
import { Actor } from '../model/Actor';

const UseCaseName = 'CreateUploadUrlForMedia' as const;

export interface Request {
  actor: Actor;
  mediaCid: string;
}

export type Response = { url: string };

export abstract class CreateUploadUrlForMedia
  implements UseCase<Request, Response>
{
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Response>;
}
