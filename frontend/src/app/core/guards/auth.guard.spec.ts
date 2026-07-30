import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';

import { User } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { authGuard } from './auth.guard';

const user: User = {
  id: 'user-1',
  username: 'Alice',
  email: 'alice@example.com',
  status: 'ONLINE',
  lastSeenAt: '2026-07-29T10:00:00Z',
  createdAt: '2026-07-28T10:00:00Z',
};

describe('authGuard', () => {
  const session = {
    getToken: vi.fn<() => string | null>(),
    currentUser: vi.fn<() => User | null>(),
    clearSession: vi.fn<() => void>(),
  };
  const authService = {
    getCurrentUser: vi.fn<() => Observable<User>>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: session },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('redirects visitors without a token to login', () => {
    session.getToken.mockReturnValue(null);

    const result = runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('allows an already restored session', () => {
    session.getToken.mockReturnValue('signed-token');
    session.currentUser.mockReturnValue(user);

    expect(runGuard()).toBe(true);
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('restores the user before allowing a persisted session', async () => {
    session.getToken.mockReturnValue('signed-token');
    session.currentUser.mockReturnValue(null);
    authService.getCurrentUser.mockReturnValue(of(user));

    const result = await firstValueFrom(runGuard() as Observable<boolean | UrlTree>);

    expect(result).toBe(true);
  });

  it('redirects to login when session restoration fails', async () => {
    session.getToken.mockReturnValue('expired-token');
    session.currentUser.mockReturnValue(null);
    authService.getCurrentUser.mockReturnValue(
      throwError(() => new Error('Unauthorized')),
    );

    const result = await firstValueFrom(runGuard() as Observable<boolean | UrlTree>);

    expect(session.clearSession).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });
});

function runGuard(): ReturnType<typeof authGuard> {
  return TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}
