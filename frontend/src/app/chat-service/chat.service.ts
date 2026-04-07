import { Injectable } from '@angular/core';
import { firstValueFrom, noop } from 'rxjs';
import { HttpService } from '../@backend/services/http.service';
import {
  ChatMessageDTO,
  ChatSessionDetailDTO,
  ChatSessionDTO,
  EvaluateDTO,
  EvaluateRequestDTO,
  FlashcardSetDTO,
  SaveAttemptRequestDTO,
  SessionStudySetsDTO,
  StudyDocumentDTO,
  TestProgressDTO,
  TestSetDTO,
} from '../@backend/models/chat';

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

  public async generateFlashcards(sessionId: number, count = 10): Promise<FlashcardSetDTO | null> {
    try {
      return await firstValueFrom(this.http.generateFlashcards(sessionId, count));
    } catch {
      return null;
    }
  }

  public async generateTest(sessionId: number, count = 10): Promise<TestSetDTO | null> {
    try {
      return await firstValueFrom(this.http.generateTest(sessionId, count));
    } catch {
      return null;
    }
  }

  public async evaluateAnswer(sessionId: number, body: EvaluateRequestDTO): Promise<EvaluateDTO | null> {
    try {
      return await firstValueFrom(this.http.evaluateAnswer(sessionId, body));
    } catch {
      return null;
    }
  }

  public async getStudySets(sessionId: number): Promise<SessionStudySetsDTO | null> {
    try {
      return await firstValueFrom(this.http.getStudySets(sessionId));
    } catch {
      return null;
    }
  }

  public async deleteStudySet(sessionId: number, studySetId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.deleteStudySet(sessionId, studySetId));
      return true;
    } catch {
      return false;
    }
  }

  public async getFlashcardSet(sessionId: number, studySetId: number): Promise<FlashcardSetDTO | null> {
    try {
      return await firstValueFrom(this.http.getFlashcardSet(sessionId, studySetId));
    } catch {
      return null;
    }
  }

  public async getTestSet(sessionId: number, studySetId: number): Promise<TestSetDTO | null> {
    try {
      return await firstValueFrom(this.http.getTestSet(sessionId, studySetId));
    } catch {
      return null;
    }
  }

  public async getTestProgress(sessionId: number, studySetId: number): Promise<TestProgressDTO | null> {
    try {
      return await firstValueFrom(this.http.getTestProgress(sessionId, studySetId));
    } catch {
      return null;
    }
  }

  public async saveAttempt(sessionId: number, body: SaveAttemptRequestDTO): Promise<void> {
    try {
      await firstValueFrom(this.http.saveAttempt(sessionId, body));
    } catch { noop(); }
  }

  public async finishTest(sessionId: number, studySetId: number): Promise<void> {
    try {
      await firstValueFrom(this.http.finishTest(sessionId, studySetId));
    } catch { noop(); }
  }
}
