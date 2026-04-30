import {
  ConflictException,
  ForbiddenException,
} from '@joka/core/src/exception';
import { Media } from '@joka/domain-media/src/domain/Media';
import { UpdateMediaRequest } from '@joka/domain-media/src/domain/UpdateMediaRequest';
import { S3Client } from '@joka/infra-object-storage/src/infrastructure/impl/S3Client';

import {
  ConfirmMedia,
  Request,
  Response,
} from '../../../domain/use-case/ConfirmMedia';
import Config from '../../config';

export class ConfirmMediaImpl extends ConfirmMedia {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { actor, mediaCid } = request;

    if (actor.cannotEdit()) {
      throw new ForbiddenException('CANNOT_EDIT_MEDIA', [
        `Media를 확정할 권한이 없습니다.`,
      ]);
    }

    const { album, user } = actor;
    const media = await this.mediaService.get(
      { album, user },
      { cid: mediaCid },
    );

    if (actor.isNotAdmin() && media.isNotOwnedBy(user)) {
      throw new ForbiddenException('OWNER_MISMATCHED', [
        `Media(${mediaCid})를 확정할 수 없습니다.`,
        `Media는 소유자만 수정할 수 있습니다.`,
      ]);
    }

    if (media.isNotReadyToComplete) {
      throw new ConflictException(
        'MEDIA_IS_NOT_READY_TO_COMPLETE',
        [
          `Media(${mediaCid})를 확정할 수 없습니다.`,
          media.state !== Media.State.PREPARING
            ? `${Media.State.PREPARING} 상태가 아닙니다.`
            : ``,
          media.hasNoContent ? `Media에 Content가 존재하지 않습니다.` : ``,
        ].filter((it) => it),
      );
    }

    await S3Client.getInstance().headOrThrow(media.content!.url);

    const updateRequest = UpdateMediaRequest.from({
      cid: mediaCid,
      state: 'COMPLETE',
      isForced: actor.isAdmin(),
      description: undefined,
      content: undefined,
    });

    return this.mediaService.update({ album, user }, updateRequest);
  }
}

export default new ConfirmMediaImpl();
