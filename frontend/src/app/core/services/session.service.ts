import { computed, Injectable, signal } from '@angular/core';

import { ACCESS_TOKEN_STORAGE_KEY } from '../constants/storage.constants';
import { AuthenticationResponse } from '../models/authentication-response.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly tokenState = signal<string | null>(
    localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY),
  );
  private readonly userState = signal<User | null>(null);

  readonly currentUser = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenState() !== null);

  getToken(): string | null {
    return this.tokenState();
  }

  setSession(response: AuthenticationResponse): void {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.accessToken);
    this.tokenState.set(response.accessToken);
    this.userState.set(response.user);
  }

  setUser(user: User): void {
    this.userState.set(user);
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    this.tokenState.set(null);
    this.userState.set(null);
  }
}
