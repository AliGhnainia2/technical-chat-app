import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { ChatMessage } from '../models/message.model';
import { Presence } from '../models/presence.model';
import { User } from '../models/user.model';
import { getUserFacingError } from '../utils/api-error.util';
import { ChatSocketService } from './chat-socket.service';
import { MessageService } from './message.service';
import { SessionService } from './session.service';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly session = inject(SessionService);
  private readonly socket = inject(ChatSocketService);
  private readonly userService = inject(UserService);
  private readonly usersState = signal<readonly User[]>([]);
  private readonly selectedUserIdState = signal<string | null>(null);
  private readonly messagesState = signal<readonly ChatMessage[]>([]);
  private readonly unreadUserIdsState = signal<ReadonlySet<string>>(new Set());
  private conversationSubscription: Subscription | null = null;
  private confirmationTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMessage: { recipientId: string; content: string } | null = null;
  private initialized = false;

  readonly users = this.usersState.asReadonly();
  readonly selectedUserId = this.selectedUserIdState.asReadonly();
  readonly messages = this.messagesState.asReadonly();
  readonly selectedUser = computed(() => {
    const selectedId = this.selectedUserIdState();
    return this.usersState().find((user) => user.id === selectedId) ?? null;
  });
  readonly usersLoading = signal(false);
  readonly conversationLoading = signal(false);
  readonly usersError = signal<string | null>(null);
  readonly conversationError = signal<string | null>(null);
  readonly sendError = signal<string | null>(null);
  readonly isSending = signal(false);
  readonly connectionStatus = this.socket.connectionStatus;

  constructor() {
    this.socket.messages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => this.handleIncomingMessage(message));
    this.socket.presence$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((presence) => this.handlePresence(presence));
    this.socket.errors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        this.isSending.set(false);
        this.clearConfirmationTimer();
        this.sendError.set(message);
      });
  }

  initialize(): void {
    if (this.initialized) {
      this.socket.connect();
      return;
    }

    this.initialized = true;
    this.usersLoading.set(true);
    this.usersError.set(null);
    this.userService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.usersState.set(sortUsers(users));
          this.usersLoading.set(false);
          this.socket.connect();
        },
        error: (error: unknown) => {
          this.initialized = false;
          this.usersLoading.set(false);
          this.usersError.set(getUserFacingError(error));
        },
      });
  }

  selectUser(userId: string): void {
    if (!this.usersState().some((user) => user.id === userId)) {
      return;
    }

    this.selectedUserIdState.set(userId);
    this.removeUnread(userId);
    this.messagesState.set([]);
    this.conversationError.set(null);
    this.conversationLoading.set(true);
    this.conversationSubscription?.unsubscribe();
    this.conversationSubscription = this.messageService
      .getConversation(userId)
      .subscribe({
        next: (messages) => {
          if (this.selectedUserIdState() === userId) {
            this.messagesState.set(sortMessages(messages));
            this.conversationLoading.set(false);
          }
        },
        error: (error: unknown) => {
          if (this.selectedUserIdState() === userId) {
            this.conversationLoading.set(false);
            this.conversationError.set(getUserFacingError(error));
          }
        },
      });
  }

  clearSelection(): void {
    this.conversationSubscription?.unsubscribe();
    this.conversationSubscription = null;
    this.selectedUserIdState.set(null);
    this.messagesState.set([]);
    this.conversationError.set(null);
    this.conversationLoading.set(false);
  }

  sendMessage(content: string): boolean {
    const recipientId = this.selectedUserIdState();
    const normalizedContent = content.trim();
    if (
      !recipientId ||
      !normalizedContent ||
      normalizedContent.length > 2000 ||
      this.socket.connectionStatus() !== 'connected'
    ) {
      return false;
    }

    this.sendError.set(null);
    const sent = this.socket.sendMessage({
      recipientId,
      content: normalizedContent,
    });
    if (sent) {
      this.pendingMessage = { recipientId, content: normalizedContent };
      this.isSending.set(true);
      this.startConfirmationTimer();
    }
    return sent;
  }

  hasUnread(userId: string): boolean {
    return this.unreadUserIdsState().has(userId);
  }

  async reset(): Promise<void> {
    this.initialized = false;
    this.conversationSubscription?.unsubscribe();
    this.conversationSubscription = null;
    this.clearConfirmationTimer();
    this.pendingMessage = null;
    this.usersState.set([]);
    this.selectedUserIdState.set(null);
    this.messagesState.set([]);
    this.unreadUserIdsState.set(new Set());
    this.usersLoading.set(false);
    this.conversationLoading.set(false);
    this.usersError.set(null);
    this.conversationError.set(null);
    this.sendError.set(null);
    this.isSending.set(false);
    await this.socket.disconnect();
  }

  private handleIncomingMessage(message: ChatMessage): void {
    const currentUserId = this.session.currentUser()?.id;
    if (!currentUserId) {
      return;
    }

    const selectedUserId = this.selectedUserIdState();
    const belongsToSelectedConversation =
      selectedUserId !== null &&
      ((message.senderId === currentUserId &&
        message.recipientId === selectedUserId) ||
        (message.senderId === selectedUserId &&
          message.recipientId === currentUserId));

    if (belongsToSelectedConversation) {
      this.messagesState.update((messages) => {
        if (messages.some((existing) => existing.id === message.id)) {
          return messages;
        }
        return sortMessages([...messages, message]);
      });
    } else if (message.recipientId === currentUserId) {
      this.unreadUserIdsState.update((unreadIds) => {
        const updated = new Set(unreadIds);
        updated.add(message.senderId);
        return updated;
      });
    }

    if (
      this.pendingMessage &&
      message.senderId === currentUserId &&
      message.recipientId === this.pendingMessage.recipientId &&
      message.content === this.pendingMessage.content
    ) {
      this.pendingMessage = null;
      this.isSending.set(false);
      this.clearConfirmationTimer();
    }
  }

  private handlePresence(presence: Presence): void {
    this.usersState.update((users) =>
      users.map((user) =>
        user.id === presence.userId
          ? {
              ...user,
              status: presence.status,
              lastSeenAt: presence.lastSeenAt,
            }
          : user,
      ),
    );
  }

  private removeUnread(userId: string): void {
    this.unreadUserIdsState.update((unreadIds) => {
      const updated = new Set(unreadIds);
      updated.delete(userId);
      return updated;
    });
  }

  private startConfirmationTimer(): void {
    this.clearConfirmationTimer();
    this.confirmationTimer = setTimeout(() => {
      if (this.pendingMessage) {
        this.pendingMessage = null;
        this.isSending.set(false);
        this.sendError.set(
          'La confirmation du message n’a pas été reçue. Vérifiez la conversation.',
        );
      }
    }, 10000);
  }

  private clearConfirmationTimer(): void {
    if (this.confirmationTimer) {
      clearTimeout(this.confirmationTimer);
      this.confirmationTimer = null;
    }
  }
}

function sortUsers(users: readonly User[]): readonly User[] {
  return [...users].sort((first, second) =>
    first.username.localeCompare(second.username, 'fr', { sensitivity: 'base' }),
  );
}

function sortMessages(messages: readonly ChatMessage[]): readonly ChatMessage[] {
  return [...messages].sort(
    (first, second) =>
      Date.parse(first.sentAt) - Date.parse(second.sentAt) ||
      first.id.localeCompare(second.id),
  );
}
