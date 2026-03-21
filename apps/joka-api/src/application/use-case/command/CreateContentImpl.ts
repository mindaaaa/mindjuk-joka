import {
  ConflictException,
  ForbiddenException,
  UncaughtException,
} from '@joka/core/src/exception';
import { Url } from '@joka/core/src/model/Url';
import { Content } from '@joka/domain-media/src/domain/Content';
import { UpdateMediaRequest } from '@joka/domain-media/src/domain/UpdateMediaRequest';
import { S3Client } from '@joka/infra-object-storage/src/infrastructure/impl/S3Client';

import {
  CreateContent,
  Request,
  Response,
} from '../../../domain/use-case/CreateContent';
import Config from '../../config';

export class CreateContentImpl extends CreateContent {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { actor, mediaCid, url } = request;

    if (actor.cannotEdit()) {
      throw new ForbiddenException('CANNOT_EDIT_MEDIA', [
        `Media에 Content를 생성할 권한이 없습니다.`,
      ]);
    }

    const { album, user } = actor;
    const media = await this.mediaService.get(
      { album, user },
      { cid: mediaCid },
    );

    if (actor.isNotAdmin() && media.isNotOwnedBy(user)) {
      throw new ForbiddenException('OWNER_MISMATCHED', [
        `Media(${mediaCid})에 Content를 생성할 수 없습니다.`,
        `Media는 소유자만 수정할 수 있습니다.`,
      ]);
    }

    if (media.hasContent) {
      throw new ConflictException('ALREADY_HAS_CONTENT', [
        `Media(${mediaCid})에 Content를 생성할 수 없습니다.`,
        `Media에 이미 Content가 존재합니다.`,
      ]);
    }

    const bucketObject = await S3Client.getInstance().headOrThrow(
      Url.from(url),
    );

    const content = Content.from({
      url,
      size: bucketObject.size,
      eTag: bucketObject.eTag,
      mimeType: bucketObject.contentType.value,
      thumbnail: null,
    });

    const updateRequest = UpdateMediaRequest.from({
      cid: mediaCid,
      description: undefined,
      state: 'PREPARING',
      isForced: actor.isAdmin(),
      content,
    });

    const updatedMedia = await this.mediaService.update(
      { album, user },
      updateRequest,
    );
    if (updatedMedia.hasNoContent) {
      throw new UncaughtException('FAILED_TO_CREATE_CONTENT', [
        `Content를 생성했지만 Media(${mediaCid})에 반영되지 않았습니다.`,
        '관리자에게 문의하세요.',
      ]);
    }

    return updatedMedia.content!;
  }
}

export default new CreateContentImpl();
