import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthenticationResponse } from '../models/authentication-response.model';
import { LoginRequest, RegisterRequest } from '../models/auth-requests.model';
import { User } from '../models/user.model';
import { ChatStateService } from './chat-state.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly chatState = inject(ChatStateService);

  login(request: LoginRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>(`${environment.apiBaseUrl}/auth/login`, request)
      .pipe(tap((response) => this.session.setSession(response)));
  }

  register(request: RegisterRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>(`${environment.apiBaseUrl}/auth/register`, request)
      .pipe(tap((response) => this.session.setSession(response)));
  }

  getCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiBaseUrl}/users/me`)
      .pipe(tap((user) => this.session.setUser(user)));
  }

  logout(): void {
    void this.chatState.reset();
    this.session.clearSession();
    void this.router.navigate(['/login']);
  }
}
