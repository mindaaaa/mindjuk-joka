import type { UserRole } from '@/entities/user';

type NullableRole = UserRole | null | undefined;

export function canUpload(role: NullableRole): boolean {
  return role === 'ADMIN' || role === 'EDITOR';
}

export function canEditMeta(
  role: NullableRole,
  uploaderId: string | undefined,
  userId: string | undefined,
): boolean {
  if (role === 'ADMIN') return true;

  const isEditor = role === 'EDITOR';
  const isOwner = !!uploaderId && uploaderId === userId;

  return isEditor && isOwner;
}

export function canDelete(
  role: NullableRole,
  uploaderId: string | undefined,
  userId: string | undefined,
): boolean {
  return canEditMeta(role, uploaderId, userId);
}
