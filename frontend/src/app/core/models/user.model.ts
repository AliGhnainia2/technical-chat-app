export type UserStatus = 'ONLINE' | 'OFFLINE';

export interface User {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  lastSeenAt: string;
  createdAt: string;
}
