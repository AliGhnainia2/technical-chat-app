import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  inject,
} from '@angular/core';

import { ChatMessage } from '../../../../core/models/message.model';
import { ChatStateService } from '../../../../core/services/chat-state.service';
import { SessionService } from '../../../../core/services/session.service';
import { MessageComposer } from '../message-composer/message-composer';

@Component({
  selector: 'app-conversation',
  imports: [DatePipe, MessageComposer],
  templateUrl: './conversation.html',
  styleUrl: './conversation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Conversation {
  @ViewChild('messageHistory')
  private messageHistory?: ElementRef<HTMLElement>;

  protected readonly chatState = inject(ChatStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(SessionService);
  protected readonly currentUser = this.session.currentUser;
  private previousSelection: string | null = null;
  private previousLoading = false;
  private userIsNearBottom = true;
  private userScrollEndExpected = false;
  private userScrollEndTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingScrollFrame: number | null = null;
  private pendingPositionFrame: number | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.pendingScrollFrame !== null) {
        cancelAnimationFrame(this.pendingScrollFrame);
      }
      if (this.pendingPositionFrame !== null) {
        cancelAnimationFrame(this.pendingPositionFrame);
      }
      if (this.userScrollEndTimer !== null) {
        clearTimeout(this.userScrollEndTimer);
      }
    });

    effect(() => {
      const selectedId = this.chatState.selectedUserId();
      const loading = this.chatState.conversationLoading();
      this.chatState.messages();
      const selectionChanged = selectedId !== this.previousSelection;
      const historyLoaded = this.previousLoading && !loading;
      const forceScroll = selectionChanged || historyLoaded;
      const shouldScroll =
        forceScroll || (this.userIsNearBottom && !this.userScrollEndExpected);

      if (selectionChanged) {
        this.userIsNearBottom = true;
      }
      this.previousSelection = selectedId;
      this.previousLoading = loading;

      if (shouldScroll) {
        this.scheduleScrollToBottom(forceScroll);
      }
    });
  }

  protected isOutgoing(message: ChatMessage): boolean {
    return message.senderId === this.currentUser()?.id;
  }

  protected startsNewDay(index: number): boolean {
    const messages = this.chatState.messages();
    if (index === 0) {
      return true;
    }
    return (
      new Date(messages[index].sentAt).toDateString() !==
      new Date(messages[index - 1].sentAt).toDateString()
    );
  }

  protected clearSelection(): void {
    this.chatState.clearSelection();
  }

  protected handleUserScrollIntent(): void {
    this.userScrollEndExpected = true;
    if (this.userScrollEndTimer !== null) {
      clearTimeout(this.userScrollEndTimer);
    }
    this.userScrollEndTimer = setTimeout(() => {
      this.userScrollEndExpected = false;
      this.userScrollEndTimer = null;
    }, 1000);

    if (this.pendingScrollFrame !== null) {
      cancelAnimationFrame(this.pendingScrollFrame);
      this.pendingScrollFrame = null;
    }
    if (this.pendingPositionFrame !== null) {
      cancelAnimationFrame(this.pendingPositionFrame);
    }
    this.pendingPositionFrame = requestAnimationFrame(() => {
      this.pendingPositionFrame = null;
      const element = this.messageHistory?.nativeElement;
      if (element) {
        this.userIsNearBottom =
          element.scrollHeight - element.scrollTop - element.clientHeight < 100;
      }
    });
  }

  protected handleHistoryScrollEnd(): void {
    if (!this.userScrollEndExpected) {
      return;
    }
    const element = this.messageHistory?.nativeElement;
    if (element) {
      this.userIsNearBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    }
    this.userScrollEndExpected = false;
    if (this.userScrollEndTimer !== null) {
      clearTimeout(this.userScrollEndTimer);
      this.userScrollEndTimer = null;
    }
  }

  @HostListener('window:resize')
  protected handleViewportResize(): void {
    if (this.userIsNearBottom && !this.userScrollEndExpected) {
      this.scheduleScrollToBottom(false);
    }
  }

  private scheduleScrollToBottom(force: boolean): void {
    if (this.pendingScrollFrame !== null) {
      cancelAnimationFrame(this.pendingScrollFrame);
    }
    this.pendingScrollFrame = requestAnimationFrame(() => {
      this.pendingScrollFrame = null;
      const element = this.messageHistory?.nativeElement;
      if (element && (force || this.userIsNearBottom)) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }
}
