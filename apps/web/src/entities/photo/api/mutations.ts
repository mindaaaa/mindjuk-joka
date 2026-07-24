import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';

import { photoKeys } from './keys';
import { removeMediaFromLists } from './queries';
import { toPhoto } from '../lib/mapper';
import type { MediaDto, Photo } from '../model/types';

import { http } from '@/shared/api';
import { ApiError } from '@/shared/api/error';

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

export interface ToggleFavoriteVars {
  id: string;
  isFavorite: boolean;
}

/**
 * 즐겨찾기 등록/해제
 *
 * - 등록/해제 전용 엔드포인트(PUT/DELETE /media/{id}/favorite)를 목표 상태로 분기해 호출한다.
 * - 상세 캐시는 낙관적으로 반영하고, 목록은 invalidate로 정합을 맞춘다.
 */
export function buildToggleFavoriteOptions(
  queryClient: QueryClient,
): UseMutationOptions<void, Error, ToggleFavoriteVars, UpdateContext> {
  return {
    mutationFn: ({ id, isFavorite }) =>
      isFavorite
        ? http.put(`/v1/media/${id}/favorite`)
        : http.delete(`/v1/media/${id}/favorite`),

    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: photoKeys.detail(id) });

      const previous = queryClient.getQueryData<Photo>(photoKeys.detail(id));
      if (previous) {
        queryClient.setQueryData<Photo>(photoKeys.detail(id), {
          ...previous,
          isFavorite,
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

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();
  return useMutation(buildToggleFavoriteOptions(queryClient));
}

/** 404는 "이미 삭제됨"이다. 실패가 아니라 목표 상태에 도달한 것으로 본다(멱등). */
export function isAlreadyDeleted(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/**
 * 삭제된 사진의 상세/목록 캐시를 즉시 정리하고, 최종 정합은 invalidate로 위임한다.
 */
function purgeDeletedPhoto(queryClient: QueryClient, id: string): void {
  queryClient.removeQueries({ queryKey: photoKeys.detail(id) });
  removeMediaFromLists(queryClient, id);
  queryClient.invalidateQueries({ queryKey: photoKeys.lists() });
}

export function buildDeletePhotoOptions(
  queryClient: QueryClient,
): UseMutationOptions<void, Error, string> {
  return {
    mutationFn: (id) => http.delete(`/v1/media/${id}`),
    meta: { operationId: 'deleteMedia' },

    onSuccess: (_data, id) => purgeDeletedPhoto(queryClient, id),

    onError: (error, id) => {
      if (isAlreadyDeleted(error)) {
        purgeDeletedPhoto(queryClient, id);
      }
    },
  };
}

export function useDeletePhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation(buildDeletePhotoOptions(queryClient));
}
