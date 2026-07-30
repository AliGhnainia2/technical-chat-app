import { UserStatus } from './user.model';

export interface Presence {
  userId: string;
  status: UserStatus;
  lastSeenAt: string;
}
