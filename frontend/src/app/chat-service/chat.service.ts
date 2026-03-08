import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '../@backend/services/http.service';
import { ChatMessageDTO, ChatSessionDetailDTO, ChatSessionDTO, StudyDocumentDTO } from '../@backend/models/chat';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private http: HttpService) {}

  public async getSessions(): Promise<ChatSessionDTO[]> {
    try {
      return await firstValueFrom(this.http.getSessions());
    } catch {
      return [];
    }
  }

  public async getSessionDetail(sessionId: number): Promise<ChatSessionDetailDTO | null> {
    try {
      return await firstValueFrom(this.http.getSessionDetail(sessionId));
    } catch {
      return null;
    }
  }

  public async createSession(title: string): Promise<ChatSessionDTO | null> {
    try {
      return await firstValueFrom(this.http.createSession(title));
    } catch {
      return null;
    }
  }

  public async uploadToSession(sessionId: number, file: File): Promise<StudyDocumentDTO | null> {
    try {
      return await firstValueFrom(this.http.uploadToSession(sessionId, file));
    } catch {
      return null;
    }
  }

  public async askQuestion(sessionId: number, message: string): Promise<ChatMessageDTO | null> {
    try {
      return await firstValueFrom(this.http.askQuestion(sessionId, message));
    } catch {
      return null;
    }
  }

  public async deleteSession(sessionId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.deleteSession(sessionId));
      return true;
    } catch {
      return false;
    }
  }
}
