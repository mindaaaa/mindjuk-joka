import {
  ForbiddenException,
  InvalidArgumentException,
} from '@joka/core/src/exception';
import { UpdateMediaRequest } from '@joka/domain-media/src/domain/UpdateMediaRequest';

import {
  UpdateMedia,
  Request,
  Response,
} from '../../../domain/use-case/UpdateMedia';
import Config from '../../config';

export class UpdateMediaImpl extends UpdateMedia {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { actor, mediaCid, description } = request;

    if (!actor.canEdit()) {
      throw new ForbiddenException('CANNOT_EDIT_MEDIA', [
        `Media를 수정할 권한이 없습니다.`,
      ]);
    }
    if (!description) {
      throw new InvalidArgumentException(`EMPTY_UPDATE_REQUEST`, [
        `Media 수정 요청이 비어있습니다.`,
        `최소한 하나의 필드를 수정해야 합니다.`,
      ]);
    }

    const { album, user } = actor;
    const isForced = actor.isAdmin();

    return this.mediaService.update(
      { album, user },
      UpdateMediaRequest.from({
        isForced,
        description,
        cid: mediaCid,
        state: undefined,
        content: undefined,
      }),
    );
  }
}

export default new UpdateMediaImpl();
