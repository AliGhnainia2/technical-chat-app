import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiError, isApiError } from '../models/api-error.model';
import { SessionService } from '../services/session.service';
import { ChatStateService } from '../services/chat-state.service';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const session = inject(SessionService);
  const chatState = inject(ChatStateService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const apiError = normalizeError(error);
      const isAuthenticationRequest =
        request.url === `${environment.apiBaseUrl}/auth/login` ||
        request.url === `${environment.apiBaseUrl}/auth/register`;

      if (error.status === 401 && !isAuthenticationRequest) {
        void chatState.reset();
        session.clearSession();
        void router.navigate(['/login']);
      }

      return throwError(() => apiError);
    }),
  );
};

function normalizeError(error: HttpErrorResponse): ApiError {
  if (isApiError(error.error)) {
    return error.error;
  }

  return {
    timestamp: new Date().toISOString(),
    status: error.status,
    error: error.status === 0 ? 'Network Error' : error.statusText || 'Request Error',
    message:
      error.status === 0
        ? 'The server could not be reached.'
        : 'The request could not be completed.',
    path: error.url ?? '',
    validationErrors: [],
  };
}
