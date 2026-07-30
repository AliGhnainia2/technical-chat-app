import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthenticationResponse } from '../models/authentication-response.model';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';

const authenticationResponse: AuthenticationResponse = {
  accessToken: 'signed-token',
  tokenType: 'Bearer',
  expiresIn: 3_600_000,
  user: {
    id: 'user-1',
    username: 'Alice',
    email: 'alice@example.com',
    status: 'ONLINE',
    lastSeenAt: '2026-07-29T10:00:00Z',
    createdAt: '2026-07-28T10:00:00Z',
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let httpController: HttpTestingController;
  let session: SessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    httpController = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
  });

  afterEach(() => httpController.verify());

  it('logs in and creates a session', () => {
    const request = { email: 'alice@example.com', password: 'password123' };

    service.login(request).subscribe((response) => {
      expect(response).toEqual(authenticationResponse);
      expect(session.getToken()).toBe('signed-token');
    });

    const httpRequest = httpController.expectOne(
      `${environment.apiBaseUrl}/auth/login`,
    );
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush(authenticationResponse);
  });

  it('registers and creates a session', () => {
    const request = {
      username: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    };

    service.register(request).subscribe();

    const httpRequest = httpController.expectOne(
      `${environment.apiBaseUrl}/auth/register`,
    );
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush(authenticationResponse);
    expect(session.currentUser()).toEqual(authenticationResponse.user);
  });

  it('restores the current user from the API', () => {
    service.getCurrentUser().subscribe();

    const httpRequest = httpController.expectOne(
      `${environment.apiBaseUrl}/users/me`,
    );
    expect(httpRequest.request.method).toBe('GET');
    httpRequest.flush(authenticationResponse.user);
    expect(session.currentUser()).toEqual(authenticationResponse.user);
  });

  it('clears the session and returns to login on logout', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    session.setSession(authenticationResponse);

    service.logout();

    expect(session.getToken()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
