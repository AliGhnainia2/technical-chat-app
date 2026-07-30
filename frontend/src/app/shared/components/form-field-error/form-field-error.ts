import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-form-field-error',
  template: `@if (message(); as currentMessage) { <span>{{ currentMessage }}</span> }`,
  styleUrl: './form-field-error.scss',
  host: { 'aria-live': 'polite' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldError {
  readonly control = input.required<AbstractControl>();
  readonly messages = input.required<Readonly<Record<string, string>>>();
  private readonly controlRevision = signal(0);

  protected readonly message = computed(() => {
    this.controlRevision();
    const control = this.control();
    if ((!control.touched && !control.dirty) || !control.errors) {
      return null;
    }

    const firstError = Object.keys(control.errors)[0];
    return this.messages()[firstError] ?? 'Valeur invalide.';
  });

  constructor() {
    effect((onCleanup) => {
      const subscription = this.control().events.subscribe(() =>
        this.controlRevision.update((revision) => revision + 1),
      );
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
