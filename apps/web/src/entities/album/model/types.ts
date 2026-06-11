import type { UserRole } from '@/entities/user';

export interface Album {
  id: string;
  name: string;
  role: UserRole;
}
