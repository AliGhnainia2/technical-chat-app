import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ChatStateService } from '../../core/services/chat-state.service';
import { HealthService } from '../../core/services/health.service';
import { Conversation } from './components/conversation/conversation';
import { UserList } from './components/user-list/user-list';

type ApiStatus = 'loading' | 'up' | 'down';

@Component({
  selector: 'app-dashboard',
  imports: [Conversation, UserList],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly destroyRef = inject(DestroyRef);
  private readonly chatState = inject(ChatStateService);
  private readonly healthService = inject(HealthService);

  protected readonly selectedUser = this.chatState.selectedUser;
  protected readonly apiStatus = signal<ApiStatus>('loading');

  constructor() {
    this.chatState.initialize();
    this.healthService
      .check()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) =>
          this.apiStatus.set(response.status === 'UP' ? 'up' : 'down'),
        error: () => this.apiStatus.set('down'),
      });
  }
}
