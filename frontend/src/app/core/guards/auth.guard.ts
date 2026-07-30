import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const session = inject(SessionService);

  if (!session.getToken()) {
    return router.createUrlTree(['/login']);
  }

  if (session.currentUser()) {
    return true;
  }

  return inject(AuthService)
    .getCurrentUser()
    .pipe(
      map(() => true),
      catchError(() => {
        session.clearSession();
        return of(router.createUrlTree(['/login']));
      }),
    );
};
