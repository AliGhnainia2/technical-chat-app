import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-app-layout',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  private readonly authService = inject(AuthService);
  private readonly session = inject(SessionService);

  protected readonly user = this.session.currentUser;
  protected readonly initials = computed(() => {
    const username = this.user()?.username.trim();
    if (!username) {
      return 'TC';
    }

    return username
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  });

  protected logout(): void {
    this.authService.logout();
  }
}
