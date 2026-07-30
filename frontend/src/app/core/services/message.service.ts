import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChatMessage } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly http = inject(HttpClient);

  getConversation(userId: string): Observable<readonly ChatMessage[]> {
    return this.http.get<readonly ChatMessage[]>(
      `${environment.apiBaseUrl}/messages/${encodeURIComponent(userId)}`,
    );
  }
}
