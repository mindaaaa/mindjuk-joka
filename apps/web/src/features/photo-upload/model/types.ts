export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'success'
  | 'error'
  | 'canceled';
export type UploadStep = 'create' | 'urls' | 'put' | 'contents' | 'confirm';

export interface UploadQueueItem {
  id: string;
  file: File;
  description: string;
  status: UploadStatus;
  step?: UploadStep | undefined;
  progress: number;
  mediaId?: string | undefined;
  errorMessage?: string | undefined;
  retryCount: number;
}
