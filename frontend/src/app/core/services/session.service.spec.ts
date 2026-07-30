import { TestBed } from '@angular/core/testing';

import { ACCESS_TOKEN_STORAGE_KEY } from '../constants/storage.constants';
import { AuthenticationResponse } from '../models/authentication-response.model';
import { SessionService } from './session.service';

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

describe('SessionService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('stores the access token and exposes the authenticated user', () => {
    const service = TestBed.inject(SessionService);

    service.setSession(authenticationResponse);

    expect(service.getToken()).toBe('signed-token');
    expect(service.currentUser()).toEqual(authenticationResponse.user);
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('signed-token');
  });

  it('restores an existing token when the service is created', () => {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'restored-token');

    const service = TestBed.inject(SessionService);

    expect(service.getToken()).toBe('restored-token');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toBeNull();
  });

  it('clears all session state', () => {
    const service = TestBed.inject(SessionService);
    service.setSession(authenticationResponse);

    service.clearSession();

    expect(service.getToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
