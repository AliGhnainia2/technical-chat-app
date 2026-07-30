import { User } from './user.model';

export interface AuthenticationResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}
