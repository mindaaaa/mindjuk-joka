import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';

import { http } from '@/shared/api';

import { toPhoto } from '../lib/mapper';
import type { MediaDto, Photo } from '../model/types';
import { photoKeys } from './keys';

export interface UpdatePhotoMetaVars {
  id: string;
  description: string;
}

interface UpdateContext {
  id: string;
  previous: Photo | undefined;
}

export function buildUpdatePhotoMetaOptions(
  queryClient: QueryClient,
): UseMutationOptions<Photo, Error, UpdatePhotoMetaVars, UpdateContext> {
  return {
    mutationFn: ({ id, description }) =>
      http.patch<MediaDto>(`/v1/media/${id}`, { description }).then(toPhoto),
    meta: { operationId: 'updateMedia' },

    onMutate: async ({ id, description }) => {
      await queryClient.cancelQueries({ queryKey: photoKeys.detail(id) });

      const previous = queryClient.getQueryData<Photo>(photoKeys.detail(id));
      if (previous) {
        queryClient.setQueryData<Photo>(photoKeys.detail(id), {
          ...previous,
          description,
        });
      }

      return { id, previous };
    },

    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          photoKeys.detail(context.id),
          context.previous,
        );
      }
    },

    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() });
    },
  };
}

export function useUpdatePhotoMetaMutation() {
  const queryClient = useQueryClient();
  return useMutation(buildUpdatePhotoMetaOptions(queryClient));
}

export function buildDeletePhotoOptions(
  queryClient: QueryClient,
): UseMutationOptions<void, Error, string> {
  return {
    mutationFn: (id) => http.delete(`/v1/media/${id}`),
    meta: { operationId: 'deleteMedia' },

    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: photoKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() });
    },
  };
}

export function useDeletePhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation(buildDeletePhotoOptions(queryClient));
}
