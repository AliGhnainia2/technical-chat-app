import { Injectable, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChatMessage, SendMessageRequest } from '../models/message.model';
import { Presence } from '../models/presence.model';
import { WebSocketError } from '../models/websocket-error.model';
import { SessionService } from './session.service';

export type SocketConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 10000];

  private readonly messageSubject = new Subject<ChatMessage>();
  private readonly presenceSubject = new Subject<Presence>();
  private readonly errorSubject = new Subject<string>();
  private readonly connectionState = signal<SocketConnectionStatus>('disconnected');
  private client: Client | null = null;
  private subscriptions: StompSubscription[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private manualDisconnect = false;

  readonly messages$: Observable<ChatMessage> = this.messageSubject.asObservable();
  readonly presence$: Observable<Presence> = this.presenceSubject.asObservable();
  readonly errors$: Observable<string> = this.errorSubject.asObservable();
  readonly connectionStatus = this.connectionState.asReadonly();

  constructor(private readonly session: SessionService) {}

  connect(): void {
    if (
      this.client?.active ||
      this.connectionState() === 'connecting' ||
      this.connectionState() === 'connected' ||
      this.reconnectTimer
    ) {
      return;
    }

    this.manualDisconnect = false;
    this.reconnectAttempts = 0;
    this.openConnection(false);
  }

  async disconnect(): Promise<void> {
    this.manualDisconnect = true;
    this.clearReconnectTimer();
    this.clearSubscriptions();
    this.connectionState.set('disconnected');
    const client = this.client;
    this.client = null;
    if (client) {
      await client.deactivate({ force: true });
    }
  }

  sendMessage(request: SendMessageRequest): boolean {
    if (!this.client?.connected) {
      this.errorSubject.next('La connexion temps réel est indisponible.');
      return false;
    }

    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(request),
    });
    return true;
  }

  private openConnection(isReconnect: boolean): void {
    const token = this.session.getToken();
    if (!token) {
      this.connectionState.set('disconnected');
      return;
    }

    this.connectionState.set(isReconnect ? 'reconnecting' : 'connecting');
    const client = new Client({
      brokerURL: environment.websocketUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 0,
      connectionTimeout: 8000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => undefined,
    });
    this.client = client;

    client.onConnect = () => {
      if (this.client !== client) {
        return;
      }
      this.reconnectAttempts = 0;
      this.connectionState.set('connected');
      this.clearSubscriptions();
      this.subscriptions = [
        client.subscribe('/user/queue/messages', (frame) =>
          this.handleMessageFrame(frame),
        ),
        client.subscribe('/topic/presence', (frame) =>
          this.handlePresenceFrame(frame),
        ),
        client.subscribe('/user/queue/errors', (frame) =>
          this.handleErrorFrame(frame),
        ),
      ];
    };

    client.onStompError = () => {
      this.errorSubject.next('Le serveur a refusé la connexion temps réel.');
    };

    client.onWebSocketError = () => {
      this.errorSubject.next('La connexion temps réel a rencontré une erreur.');
    };

    client.onWebSocketClose = () => {
      if (this.client !== client) {
        return;
      }
      this.client = null;
      this.clearSubscriptions();
      this.connectionState.set('disconnected');
      if (!this.manualDisconnect) {
        this.scheduleReconnect();
      }
    };

    client.activate();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= ChatSocketService.MAX_RECONNECT_ATTEMPTS) {
      this.errorSubject.next(
        'La reconnexion temps réel a échoué. Rechargez la page pour réessayer.',
      );
      return;
    }

    const delay =
      ChatSocketService.RECONNECT_DELAYS[this.reconnectAttempts] ??
      ChatSocketService.RECONNECT_DELAYS.at(-1) ??
      10000;
    this.reconnectAttempts += 1;
    this.connectionState.set('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualDisconnect) {
        this.openConnection(true);
      }
    }, delay);
  }

  private handleMessageFrame(frame: IMessage): void {
    const message = parseJson(frame.body, isChatMessage);
    if (message) {
      this.messageSubject.next(message);
    }
  }

  private handlePresenceFrame(frame: IMessage): void {
    const presence = parseJson(frame.body, isPresence);
    if (presence) {
      this.presenceSubject.next(presence);
    }
  }

  private handleErrorFrame(frame: IMessage): void {
    const error = parseJson(frame.body, isWebSocketError);
    this.errorSubject.next(
      error?.message ?? 'Le message n’a pas pu être envoyé.',
    );
  }

  private clearSubscriptions(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = [];
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

function parseJson<T>(
  body: string,
  guard: (value: unknown) => value is T,
): T | null {
  try {
    const value = JSON.parse(body) as unknown;
    return guard(value) ? value : null;
  } catch {
    return null;
  }
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value['id'] === 'string' &&
    typeof value['senderId'] === 'string' &&
    typeof value['recipientId'] === 'string' &&
    typeof value['content'] === 'string' &&
    typeof value['sentAt'] === 'string' &&
    ['SENT', 'DELIVERED', 'READ'].includes(String(value['status']))
  );
}

function isPresence(value: unknown): value is Presence {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value['userId'] === 'string' &&
    ['ONLINE', 'OFFLINE'].includes(String(value['status'])) &&
    typeof value['lastSeenAt'] === 'string'
  );
}

function isWebSocketError(value: unknown): value is WebSocketError {
  return (
    isRecord(value) &&
    typeof value['timestamp'] === 'string' &&
    typeof value['message'] === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
