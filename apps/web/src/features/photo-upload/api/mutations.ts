import { putToS3, PutToS3Options } from '../lib/s3-uploader';
import { UploadQueueItem, UploadStep } from '../model/types';

import { http } from '@/shared/api';
import type { RequestOptions } from '@/shared/api/client';
import { createMediaUploadFlow } from '@/shared/lib/media-upload-logging';

interface CreateMediaResponse {
  id: string;
  state: string;
}

interface UploadUrlsResponse {
  url: string;
}

export interface UploadCallbacks {
  onStep: (step: UploadStep) => void;
  onProgress: (percent: number) => void;
  signal?: AbortSignal;
}

type UploadFlow = ReturnType<typeof createMediaUploadFlow>;

export async function uploadSinglePhoto(
  item: UploadQueueItem,
  callbacks: UploadCallbacks,
): Promise<string> {
  const { onStep, onProgress, signal } = callbacks;
  const reqOptions = signal ? { signal } : undefined;

  onStep('create');
  const mediaId = await createMedia(item, reqOptions);

  const flow = createMediaUploadFlow(mediaId);

  try {
    onStep('urls');
    flow.onUploadUrlsRequest('DRAFT');
    const url = await getUploadUrl(mediaId, reqOptions);

    onStep('put');
    const putOptions: PutToS3Options = { onProgress };
    if (signal) {
      putOptions.signal = signal;
    }
    await putToS3(url, item.file, putOptions);

    onStep('contents');

    const contentUrl = url.split('?')[0];
    await registerContents(mediaId, contentUrl, reqOptions);

    onStep('confirm');
    await confirmMedia(mediaId, flow, reqOptions);

    return mediaId;
  } finally {
    flow.destroy();
  }
}

async function createMedia(
  item: UploadQueueItem,
  reqOptions?: RequestOptions,
): Promise<string> {
  const created = await http.post<CreateMediaResponse>(
    '/v1/media',
    { description: item.description.trim() || item.file.name },
    reqOptions,
  );

  return created.id;
}

async function getUploadUrl(
  mediaId: string,
  reqOptions?: RequestOptions,
): Promise<string> {
  const { url } = await http.post<UploadUrlsResponse>(
    `/v1/media/${mediaId}/upload-urls`,
    {},
    reqOptions,
  );

  return url;
}

async function registerContents(
  mediaId: string,
  url: string,
  reqOptions?: RequestOptions,
): Promise<void> {
  await http.post(`/v1/media/${mediaId}/contents`, { url }, reqOptions);
}

async function confirmMedia(
  mediaId: string,
  flow: UploadFlow,
  reqOptions?: RequestOptions,
): Promise<void> {
  try {
    await http.post(`/v1/media/${mediaId}/confirm`, {}, reqOptions);
    flow.onConfirmDone(true);
  } catch (err) {
    flow.onConfirmDone(false);
    throw err;
  }
}
