import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { User } from '../../../../core/models/user.model';
import { ChatStateService } from '../../../../core/services/chat-state.service';
import { SocketConnectionStatus } from '../../../../core/services/chat-socket.service';
import { MessageComposer } from './message-composer';

const selectedUser: User = {
  id: 'user-2',
  username: 'Bob',
  email: 'bob@example.com',
  status: 'ONLINE',
  lastSeenAt: '2026-07-30T08:00:00Z',
  createdAt: '2026-07-29T08:00:00Z',
};

describe('MessageComposer', () => {
  let fixture: ComponentFixture<MessageComposer>;
  let textarea: HTMLTextAreaElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MessageComposer],
      providers: [
        {
          provide: ChatStateService,
          useValue: {
            selectedUser: signal<User | null>(selectedUser).asReadonly(),
            connectionStatus:
              signal<SocketConnectionStatus>('connected').asReadonly(),
            isSending: signal(false).asReadonly(),
            sendError: signal<string | null>(null).asReadonly(),
            sendMessage: vi.fn().mockReturnValue(true),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(MessageComposer);
    fixture.detectChanges();
    textarea = fixture.nativeElement.querySelector(
      '#message-content',
    ) as HTMLTextAreaElement;
  });

  it('inserts an emoji at the current cursor and restores textarea focus', async () => {
    setTextareaValue('Bonjour monde', 8);
    openPicker();

    getEmojiButton('Pouce levé').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(textarea.value).toBe('Bonjour 👍monde');
    expect(textarea.selectionStart).toBe(10);
    expect(document.activeElement).toBe(textarea);
    expect(getPicker()).toBeNull();
  });

  it('does not exceed the 2000-character limit', async () => {
    const content = 'a'.repeat(1999);
    setTextareaValue(content, content.length);
    openPicker();

    getEmojiButton('Visage souriant').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(textarea.value).toBe(content);
    expect(fixture.nativeElement.textContent).toContain(
      'La limite de 2000 caractères est atteinte.',
    );
    expect(getPicker()).toBeNull();
  });

  it('closes the picker with Escape and an outside click', () => {
    openPicker();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(getPicker()).toBeNull();

    openPicker();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(getPicker()).toBeNull();
  });

  function setTextareaValue(value: string, cursor: number): void {
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    textarea.setSelectionRange(cursor, cursor);
    textarea.dispatchEvent(new Event('select'));
    fixture.detectChanges();
  }

  function openPicker(): void {
    const toggle = fixture.nativeElement.querySelector(
      '.emoji-button',
    ) as HTMLButtonElement;
    toggle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    toggle.click();
    fixture.detectChanges();
    expect(getPicker()).not.toBeNull();
  }

  function getEmojiButton(label: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      `app-emoji-picker button[aria-label="${label}"]`,
    ) as HTMLButtonElement;
  }

  function getPicker(): HTMLElement | null {
    return fixture.nativeElement.querySelector('app-emoji-picker');
  }
});
