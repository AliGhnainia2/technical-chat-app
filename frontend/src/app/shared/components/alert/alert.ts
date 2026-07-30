import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-alert',
  template: `
    <div class="alert" role="alert">
      <span aria-hidden="true">!</span>
      <p>{{ message() }}</p>
    </div>
  `,
  styleUrl: './alert.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alert {
  readonly message = input.required<string>();
}
