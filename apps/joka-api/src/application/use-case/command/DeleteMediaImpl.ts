import { ForbiddenException } from '@joka/core/src/exception';
import { Url } from '@joka/core/src/model/Url';
import { Nullish } from '@joka/core/src/type';
import { S3Client } from '@joka/infra-object-storage/src/infrastructure/impl/S3Client';

import {
  DeleteMedia,
  Request,
  Response,
} from '../../../domain/use-case/DeleteMedia';
import Config from '../../config';

export class DeleteMediaImpl extends DeleteMedia {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { actor, mediaCid } = request;

    if (actor.cannotEdit()) {
      throw new ForbiddenException('CANNOT_EDIT_MEDIA', [
        `Media를 삭제할 권한이 없습니다.`,
      ]);
    }

    const { album, user } = actor;
    const isForced = actor.isAdmin();

    const media = await this.mediaService.get(
      { album, user },
      { cid: mediaCid },
    );

    const result = await this.mediaService.delete(
      { album, user },
      { cid: mediaCid, isForced },
    );

    const keys: string[] = [
      this.tryToGetPath(media.content?.url),
      this.tryToGetPath(media.content?.thumbnail?.url),
    ].filter((it) => typeof it === 'string');

    if (keys.length) {
      await S3Client.getInstance().deleteMany(keys);
    }

    return result;
  }

  private tryToGetPath(url: Nullish<Url>): string | null {
    if (!url) {
      return null;
    }

    const path = url.getPath({ withoutBeginningSlash: true });
    return path.substring(path.indexOf('/') + 1);
  }
}

export default new DeleteMediaImpl();
