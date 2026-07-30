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

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Alert, FormFieldError, LoadingSpinner],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  protected readonly emailMessages = {
    required: 'L’adresse e-mail est requise.',
    email: 'Saisissez une adresse e-mail valide.',
  };
  protected readonly passwordMessages = {
    required: 'Le mot de passe est requis.',
  };
  protected readonly isSubmitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly submissionError = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submissionError.set(null);
    this.authService
      .login(this.form.getRawValue())
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
