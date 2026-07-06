import { Media } from '@joka/domain-media/src/domain/Media';

import { UseCase } from './UseCase';

const UseCaseName = 'ExtractThumbnail' as const;

export interface Request {
  mediaCid: string;
}

export type Response = Media;

export abstract class ExtractThumbnail implements UseCase<Request, Response> {
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Response>;
}
