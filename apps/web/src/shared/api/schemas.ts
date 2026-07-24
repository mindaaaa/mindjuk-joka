import {
  zAlbum,
  zContent,
  zGetMyInfoResponse,
  zListAlbumsResponse,
  zListMediaResponse,
  zMedia,
  zThumbnail,
} from '@joka/lib-openapi';
import { z } from 'zod';

// size는 bigint(JSON.stringify 불가)라 number로 좁힌다.
const zSize = z.coerce.number().int().positive();

const zThumbnailSchema = zThumbnail.extend({ size: zSize });
const zContentSchema = zContent.extend({
  size: zSize,
  thumbnail: z.optional(zThumbnailSchema),
});
const zMediaSchema = zMedia.extend({ content: z.optional(zContentSchema) });

export const MediaSchema = zMediaSchema;
export const MediaListSchema = zListMediaResponse.extend({
  items: z.array(zMediaSchema),
});
export const AlbumListSchema = zListAlbumsResponse;
export const AlbumSchema = zAlbum;
export const MeSchema = zGetMyInfoResponse;

export type MediaDto = z.infer<typeof MediaSchema>;
export type MediaContent = z.infer<typeof zContentSchema>;
export type MediaThumbnail = z.infer<typeof zThumbnailSchema>;
export type MediaListResponse = z.infer<typeof MediaListSchema>;
export type MediaPagination = MediaListResponse['pagination'];
export type AlbumListResponse = z.infer<typeof AlbumListSchema>;
export type AlbumDto = z.infer<typeof AlbumSchema>;
export type MeResponse = z.infer<typeof MeSchema>;
