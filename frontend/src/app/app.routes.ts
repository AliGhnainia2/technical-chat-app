import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { AppLayout } from './layouts/app-layout/app-layout';
import { AuthLayout } from './layouts/auth-layout/auth-layout';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthLayout,
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./features/auth/login/login.routes').then((module) => module.LOGIN_ROUTES),
  },
  {
    path: 'register',
    component: AuthLayout,
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./features/auth/register/register.routes').then(
        (module) => module.REGISTER_ROUTES,
      ),
  },
  {
    path: 'dashboard',
    component: AppLayout,
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (module) => module.DASHBOARD_ROUTES,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found').then((module) => module.NotFound),
  },
];
