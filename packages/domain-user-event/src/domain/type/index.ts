export interface Payload {
  name: string;
  timestamp: number;
  // TODO: Actor Role과 통합 필요해보임
  userRole: 'EDITOR' | 'VIEWER' | 'ADMIN';
  [key: string]: unknown;
}
