import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs';

import { ChatStateService } from '../../../../core/services/chat-state.service';
import { EmojiPicker } from './emoji-picker/emoji-picker';

@Component({
  selector: 'app-message-composer',
  imports: [EmojiPicker, ReactiveFormsModule],
  templateUrl: './message-composer.html',
  styleUrl: './message-composer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposer {
  @ViewChild('messageTextarea')
  private messageTextarea?: ElementRef<HTMLTextAreaElement>;

  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly chatState = inject(ChatStateService);
  protected readonly contentControl = new FormControl('', { nonNullable: true });
  protected readonly emojiPickerOpen = signal(false);
  protected readonly emojiLimitReached = signal(false);
  private selectionStart = 0;
  private selectionEnd = 0;
  protected readonly content = toSignal(
    this.contentControl.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  );
  protected readonly isDisabled = computed(() => {
    const content = this.content();
    return (
      !this.chatState.selectedUser() ||
      this.chatState.connectionStatus() !== 'connected' ||
      this.chatState.isSending() ||
      content.trim().length === 0 ||
      content.length > 2000
    );
  });

  protected send(): void {
    if (!this.isDisabled() && this.chatState.sendMessage(this.content())) {
      this.contentControl.reset('');
      this.emojiPickerOpen.set(false);
      this.emojiLimitReached.set(false);
      this.selectionStart = 0;
      this.selectionEnd = 0;
    }
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  protected toggleEmojiPicker(): void {
    this.rememberSelection();
    this.emojiPickerOpen.update((open) => !open);
  }

  protected rememberSelection(): void {
    const textarea = this.messageTextarea?.nativeElement;
    if (textarea) {
      this.selectionStart = textarea.selectionStart ?? textarea.value.length;
      this.selectionEnd = textarea.selectionEnd ?? this.selectionStart;
    }
    if (this.content().length < 2000) {
      this.emojiLimitReached.set(false);
    }
  }

  protected insertEmoji(emoji: string): void {
    const value = this.contentControl.value;
    const start = Math.min(this.selectionStart, value.length);
    const end = Math.min(Math.max(this.selectionEnd, start), value.length);
    const nextValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`;

    if (nextValue.length > 2000) {
      this.emojiLimitReached.set(true);
      this.closeEmojiPicker(true);
      return;
    }

    const cursorPosition = start + emoji.length;
    this.contentControl.setValue(nextValue);
    this.selectionStart = cursorPosition;
    this.selectionEnd = cursorPosition;
    this.emojiLimitReached.set(false);
    this.closeEmojiPicker(true);
  }

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (
      this.emojiPickerOpen() &&
      target instanceof Node &&
      !this.host.nativeElement.contains(target)
    ) {
      this.closeEmojiPicker(false);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected handleEscape(event: Event): void {
    if (this.emojiPickerOpen()) {
      event.preventDefault();
      this.closeEmojiPicker(true);
    }
  }

  private closeEmojiPicker(focusTextarea: boolean): void {
    this.emojiPickerOpen.set(false);
    if (focusTextarea) {
      queueMicrotask(() => {
        const textarea = this.messageTextarea?.nativeElement;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(this.selectionStart, this.selectionEnd);
        }
      });
    }
  }
}
