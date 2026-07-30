import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { ChatMessage } from '../models/message.model';
import { Presence } from '../models/presence.model';
import { User } from '../models/user.model';
import {
  ChatSocketService,
  SocketConnectionStatus,
} from './chat-socket.service';
import { ChatStateService } from './chat-state.service';
import { MessageService } from './message.service';
import { SessionService } from './session.service';
import { UserService } from './user.service';

const currentUser: User = {
  id: 'current-user',
  username: 'Alice',
  email: 'alice@example.com',
  status: 'ONLINE',
  lastSeenAt: '2026-07-29T10:00:00Z',
  createdAt: '2026-07-28T10:00:00Z',
};

const bob: User = {
  id: 'bob',
  username: 'Bob',
  email: 'bob@example.com',
  status: 'OFFLINE',
  lastSeenAt: '2026-07-29T09:00:00Z',
  createdAt: '2026-07-28T10:00:00Z',
};

const charlie: User = {
  id: 'charlie',
  username: 'Charlie',
  email: 'charlie@example.com',
  status: 'OFFLINE',
  lastSeenAt: '2026-07-29T08:00:00Z',
  createdAt: '2026-07-28T10:00:00Z',
};

describe('ChatStateService', () => {
  let service: ChatStateService;
  let messages: Subject<ChatMessage>;
  let presence: Subject<Presence>;
  let connectionState: ReturnType<typeof signal<SocketConnectionStatus>>;
  let socket: {
    messages$: Subject<ChatMessage>;
    presence$: Subject<Presence>;
    errors$: Subject<string>;
    connectionStatus: ReturnType<
      ReturnType<typeof signal<SocketConnectionStatus>>['asReadonly']
    >;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
  };
  let messageService: {
    getConversation: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    messages = new Subject<ChatMessage>();
    presence = new Subject<Presence>();
    connectionState = signal<SocketConnectionStatus>('connected');
    socket = {
      messages$: messages,
      presence$: presence,
      errors$: new Subject<string>(),
      connectionStatus: connectionState.asReadonly(),
      connect: vi.fn(),
      disconnect: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockReturnValue(true),
    };
    messageService = {
      getConversation: vi.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      providers: [
        ChatStateService,
        { provide: UserService, useValue: { getUsers: () => of([charlie, bob]) } },
        { provide: MessageService, useValue: messageService },
        { provide: ChatSocketService, useValue: socket },
        {
          provide: SessionService,
          useValue: { currentUser: signal(currentUser).asReadonly() },
        },
      ],
    });
    service = TestBed.inject(ChatStateService);
    service.initialize();
  });

  afterEach(async () => {
    await service.reset();
  });

  it('loads and sorts users before connecting the socket', () => {
    expect(service.users().map((user) => user.id)).toEqual(['bob', 'charlie']);
    expect(socket.connect).toHaveBeenCalledOnce();
  });

  it('loads a selected conversation in chronological order', () => {
    const later = createMessage('message-2', '2026-07-29T10:02:00Z');
    const earlier = createMessage('message-1', '2026-07-29T10:01:00Z');
    messageService.getConversation.mockReturnValue(of([later, earlier]));

    service.selectUser('bob');

    expect(messageService.getConversation).toHaveBeenCalledWith('bob');
    expect(service.messages().map((message) => message.id)).toEqual([
      'message-1',
      'message-2',
    ]);
  });

  it('deduplicates selected messages and flags another sender as unread', () => {
    service.selectUser('bob');
    const selectedMessage = createMessage('message-1', '2026-07-29T10:01:00Z');
    messages.next(selectedMessage);
    messages.next(selectedMessage);
    messages.next({
      ...selectedMessage,
      id: 'message-2',
      senderId: 'charlie',
    });

    expect(service.messages()).toHaveLength(1);
    expect(service.hasUnread('charlie')).toBe(true);
  });

  it('merges presence updates into the loaded users', () => {
    presence.next({
      userId: 'bob',
      status: 'ONLINE',
      lastSeenAt: '2026-07-29T10:03:00Z',
    });

    expect(service.users().find((user) => user.id === 'bob')).toMatchObject({
      status: 'ONLINE',
      lastSeenAt: '2026-07-29T10:03:00Z',
    });
  });

  it('sends only the recipient and normalized content', () => {
    service.selectUser('bob');

    expect(service.sendMessage('  Bonjour Bob  ')).toBe(true);
    expect(socket.sendMessage).toHaveBeenCalledWith({
      recipientId: 'bob',
      content: 'Bonjour Bob',
    });
    expect(service.isSending()).toBe(true);
  });
});

function createMessage(id: string, sentAt: string): ChatMessage {
  return {
    id,
    senderId: 'bob',
    recipientId: currentUser.id,
    content: 'Bonjour',
    sentAt,
    status: 'SENT',
  };
}
