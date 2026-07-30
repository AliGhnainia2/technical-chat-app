import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { getUserFacingError } from '../../../core/utils/api-error.util';
import { Alert } from '../../../shared/components/alert/alert';
import { FormFieldError } from '../../../shared/components/form-field-error/form-field-error';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { passwordMatchValidator } from '../../../shared/validators/password-match.validator';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Alert, FormFieldError, LoadingSpinner],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup(
    {
      username: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30),
        ],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
      passwordConfirmation: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [passwordMatchValidator] },
  );
  protected readonly usernameMessages = {
    required: 'Le nom d’utilisateur est requis.',
    minlength: 'Le nom doit contenir au moins 3 caractères.',
    maxlength: 'Le nom ne peut pas dépasser 30 caractères.',
  };
  protected readonly emailMessages = {
    required: 'L’adresse e-mail est requise.',
    email: 'Saisissez une adresse e-mail valide.',
  };
  protected readonly passwordMessages = {
    required: 'Le mot de passe est requis.',
    minlength: 'Le mot de passe doit contenir au moins 8 caractères.',
  };
  protected readonly confirmationMessages = {
    required: 'Confirmez votre mot de passe.',
  };
  protected readonly isSubmitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly submissionError = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, email, password } = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.submissionError.set(null);
    this.authService
      .register({ username, email, password })
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigate(['/dashboard']),
        error: (error: unknown) =>
          this.submissionError.set(getUserFacingError(error)),
      });
  }
}
