import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthenticationResponse } from '../../../core/models/authentication-response.model';
import { AuthService } from '../../../core/services/auth.service';
import { Register } from './register';

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

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  const authService = {
    register: vi.fn(() => of(authenticationResponse)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Register);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('validates all required fields', () => {
    submitForm(fixture);

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Le nom d’utilisateur est requis.');
    expect(content).toContain('L’adresse e-mail est requise.');
    expect(content).toContain('Le mot de passe est requis.');
    expect(content).toContain('Confirmez votre mot de passe.');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('rejects different passwords', () => {
    setInput(fixture, '#username', 'Alice');
    setInput(fixture, '#email', 'alice@example.com');
    setInput(fixture, '#password', 'password123');
    setInput(fixture, '#passwordConfirmation', 'different123');
    submitForm(fixture);

    expect(fixture.nativeElement.textContent).toContain(
      'Les mots de passe ne correspondent pas.',
    );
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('sends only fields accepted by the backend', () => {
    setInput(fixture, '#username', 'Alice');
    setInput(fixture, '#email', 'alice@example.com');
    setInput(fixture, '#password', 'password123');
    setInput(fixture, '#passwordConfirmation', 'password123');
    submitForm(fixture);

    expect(authService.register).toHaveBeenCalledWith({
      username: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    });
  });
});

function setInput(
  fixture: ComponentFixture<Register>,
  selector: string,
  value: string,
): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

function submitForm(fixture: ComponentFixture<Register>): void {
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}
