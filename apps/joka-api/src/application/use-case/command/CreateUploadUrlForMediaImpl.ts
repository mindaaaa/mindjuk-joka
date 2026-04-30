import {
  ConflictException,
  ForbiddenException,
} from '@joka/core/src/exception';
import { S3Client } from '@joka/infra-object-storage/src/infrastructure/impl/S3Client';

import {
  CreateUploadUrlForMedia,
  Request,
  Response,
} from '../../../domain/use-case/CreateUploadUrlForMedia';
import Config from '../../config';

export class CreateUploadUrlForMediaImpl extends CreateUploadUrlForMedia {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { actor, mediaCid } = request;

    if (actor.cannotEdit()) {
      throw new ForbiddenException('CANNOT_EDIT_MEDIA', [
        `Media 업로드 URL을 생성할 권한이 없습니다.`,
      ]);
    }

    const { album, user } = actor;
    const media = await this.mediaService.get(
      { album, user },
      { cid: mediaCid },
    );
    if (media.hasContent) {
      throw new ConflictException('ALREADY_UPLOADED', [
        `Media(${mediaCid})의 업로드 URL을 생성할 수 없습니다.`,
        `Media에 이미 Content가 업로드되어 있습니다.`,
      ]);
    }

    if (actor.isAdmin() || media.isOwnedBy(user)) {
      const key = `media/${mediaCid}/original`;
      const presignedUrl =
        await S3Client.getInstance().getPresignedUrlForUpload(
          Config.mediaBucketName,
          key,
        );

      return { url: presignedUrl.fullPath };
    }

    throw new ForbiddenException('OWNER_MISMATCHED', [
      `Media(${mediaCid})의 업로드 URL을 생성할 수 없습니다.`,
      `Media는 소유자만 업로드할 수 있습니다.`,
    ]);
  }
}

export default new CreateUploadUrlForMediaImpl();
