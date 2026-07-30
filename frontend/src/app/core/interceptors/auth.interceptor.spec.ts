import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from '../services/session.service';

describe('authInterceptor', () => {
  let httpController: HttpTestingController;
  let session: SessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpController = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
  });

  afterEach(() => httpController.verify());

  it('adds the bearer token to API requests', () => {
    vi.spyOn(session, 'getToken').mockReturnValue('signed-token');

    TestBed.inject(HttpClient)
      .get(`${environment.apiBaseUrl}/users/me`)
      .subscribe();

    const request = httpController.expectOne(`${environment.apiBaseUrl}/users/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    request.flush({});
  });

  it('does not add credentials to external requests', () => {
    TestBed.inject(HttpClient)
      .get('https://example.com/status')
      .subscribe();

    const request = httpController.expectOne('https://example.com/status');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
