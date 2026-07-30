import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs';

import { User } from '../../../../core/models/user.model';
import { ChatStateService } from '../../../../core/services/chat-state.service';

@Component({
  selector: 'app-user-list',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserList {
  protected readonly chatState = inject(ChatStateService);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  );

  protected readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!term) {
      return this.chatState.users();
    }
    return this.chatState
      .users()
      .filter((user) =>
        `${user.username} ${user.email}`.toLocaleLowerCase('fr').includes(term),
      );
  });

  protected selectUser(userId: string): void {
    this.chatState.selectUser(userId);
  }

  protected initials(user: User): string {
    return user.username
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
}
