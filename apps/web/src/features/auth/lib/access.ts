import type { UserRole } from '@/entities/user';

type NullableRole = UserRole | null | undefined;

export function canUpload(role: NullableRole): boolean {
  return role === 'ADMIN' || role === 'EDITOR';
}

// 쓰기 권한은 수정과 삭제를 함께 포함한다(제품 정책: 쓰기 = 수정 + 삭제).
export function canWriteMeta(
  role: NullableRole,
  uploaderId: string | undefined,
  userId: string | undefined,
): boolean {
  if (role === 'ADMIN') return true;

  const isEditor = role === 'EDITOR';
  const isOwner = !!uploaderId && uploaderId === userId;

  return isEditor && isOwner;
}
