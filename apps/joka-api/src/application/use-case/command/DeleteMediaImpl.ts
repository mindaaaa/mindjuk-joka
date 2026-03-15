import { ForbiddenException } from '@joka/core/src/exception';

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

    if (!actor.canEdit()) {
      throw new ForbiddenException('CANNOT_EDIT_MEDIA', [
        `Media를 삭제할 권한이 없습니다.`,
      ]);
    }

    const { album, user } = actor;
    const isForced = actor.isAdmin();

    return this.mediaService.delete(
      { album, user },
      { cid: mediaCid, isForced },
    );
  }
}

export default new DeleteMediaImpl();
