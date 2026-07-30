import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionService } from '../services/session.service';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(SessionService).getToken()
    ? router.createUrlTree(['/dashboard'])
    : true;
};
