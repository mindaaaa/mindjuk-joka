import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { Media } from '@joka/domain-media/src/domain/Media';

import { UseCase } from './UseCase';

const UseCaseName = 'CreateMedia' as const;

export interface Request {
  album: Album;
  user: User;
  description: string;
}

export type Response = Media;

export abstract class CreateMedia implements UseCase<Request, Response> {
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Media>;
}
