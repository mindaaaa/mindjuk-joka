export type { paths, components, operations } from './generated/api-v1';

export {
  // schemas
  zMediaState,
  zLocation,
  zThumbnail,
  zContent,
  zUser,
  zActioned,
  zMedia,
  zRole,
  zError,
  zAlbum,

  // request bodies
  zCreateMedia,
  zUpdateMedia,
  zCreateContent,
  zCreateUploadUrlForMedia,
  zConfirmMedia,
  zLogin,
  zLogout,

  // operation data (request validation)
  zListMediaData,
  zCreateMediaData,
  zGetMediaData,
  zUpdateMediaData,
  zDeleteMediaData,
  zCreateUploadUrlForMediaData,
  zConfirmMediaData,
  zCreateContentData,
  zListAlbumsData,
  zLoginData,
  zLogoutData,
  zGetMyInfoData,

  // operation responses
  zListMediaResponse,
  zCreateMediaResponse,
  zGetMediaResponse,
  zUpdateMediaResponse,
  zDeleteMediaResponse,
  zCreateUploadUrlForMediaResponse,
  zConfirmMediaResponse,
  zCreateContentResponse,
  zListAlbumsResponse,
  zLoginResponse,
  zLogoutResponse,
  zGetMyInfoResponse,
} from './generated/type/zod.gen';

export { createApiClient } from './client';
