export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  sentAt: string;
  status: MessageStatus;
}

export interface SendMessageRequest {
  recipientId: string;
  content: string;
}
