import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthenticationResponse } from '../../../core/models/authentication-response.model';
import { AuthService } from '../../../core/services/auth.service';
import { Login } from './login';

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

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  const authService = {
    login: vi.fn(() => of(authenticationResponse)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
  });

  it('shows validation messages for an empty submission', () => {
    submitForm(fixture);

    expect(fixture.nativeElement.textContent).toContain(
      'L’adresse e-mail est requise.',
    );
    expect(fixture.nativeElement.textContent).toContain('Le mot de passe est requis.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('rejects an invalid email address', () => {
    setInput(fixture, '#email', 'not-an-email');
    submitForm(fixture);

    expect(fixture.nativeElement.textContent).toContain(
      'Saisissez une adresse e-mail valide.',
    );
  });
});

function setInput(
  fixture: ComponentFixture<Login>,
  selector: string,
  value: string,
): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

function submitForm(fixture: ComponentFixture<Login>): void {
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}
