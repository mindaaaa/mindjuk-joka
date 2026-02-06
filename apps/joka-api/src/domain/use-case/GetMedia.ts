import { Album } from '@joka/core/src/model/Album';
import { User } from '@joka/core/src/model/User';
import { Media } from '@joka/domain-media/src/domain/Media';

import { UseCase } from './UseCase';

const UseCaseName = 'GetMedia' as const;

interface Request {
  album: Album;
  user: User;
  mediaCid: string;
}

type Response = Media;

export abstract class GetMedia implements UseCase<Request, Response> {
  get name(): string {
    return UseCaseName;
  }

  abstract invoke(request: Request): Promise<Media>;
}
