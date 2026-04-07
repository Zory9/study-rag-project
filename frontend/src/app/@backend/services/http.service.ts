import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
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
} from '../models/chat';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  private readonly url: string = environment.apiURL;

  constructor(private httpClient: HttpClient) {}

  private post(endpoint: string, body: any) {
    return this.httpClient.post(`${this.url}${endpoint}`, body, {
      responseType: 'text',
      withCredentials: true,
    });
  }

  public getUser(): Observable<any> {
    return this.httpClient.get(`${this.url}/api/User/get-user`, { withCredentials: true });
  }

  public registerUser(email: string, username: string, password: string): Observable<any> {
    return this.post('/api/Auth/register', {
      email: email,
      username: username,
      password: password,
    });
  }

  public loginUser(email: string, password: string): Observable<any> {
    return this.post('/api/Auth/login', {
      email: email,
      password: password,
    });
  }

  public logoutUser(): Observable<any> {
    return this.post('/api/Auth/logout', {});
  }

  public getSessions(): Observable<ChatSessionDTO[]> {
    return this.httpClient.get<ChatSessionDTO[]>(`${this.url}/api/Chat/chat-sessions`, { withCredentials: true });
  }

  public getSessionDetail(sessionId: number): Observable<ChatSessionDetailDTO> {
    return this.httpClient.get<ChatSessionDetailDTO>(`${this.url}/api/Chat/chat-session/${sessionId}`, { withCredentials: true });
  }

  public createSession(title: string): Observable<ChatSessionDTO> {
    return this.httpClient.post<ChatSessionDTO>(`${this.url}/api/Chat/chat-session`, { title }, { withCredentials: true });
  }

  public uploadToSession(sessionId: number, file: File): Observable<StudyDocumentDTO> {
    const form = new FormData();
    form.append('file', file);
    return this.httpClient.post<StudyDocumentDTO>(`${this.url}/api/Chat/chat-session/${sessionId}/upload`, form, { withCredentials: true });
  }

  public askQuestion(sessionId: number, message: string): Observable<ChatMessageDTO> {
    return this.httpClient.post<ChatMessageDTO>(`${this.url}/api/Chat/chat-session/${sessionId}/ask`, { message }, { withCredentials: true });
  }

  public deleteSession(sessionId: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.url}/api/Chat/chat-session/${sessionId}`, { withCredentials: true });
  }

  public generateFlashcards(sessionId: number, count = 10): Observable<FlashcardSetDTO> {
    return this.httpClient.post<FlashcardSetDTO>(
      `${this.url}/api/Chat/chat-session/${sessionId}/flashcards?count=${count}`,
      {},
      { withCredentials: true },
    );
  }

  public generateTest(sessionId: number, count = 10): Observable<TestSetDTO> {
    return this.httpClient.post<TestSetDTO>(
      `${this.url}/api/Chat/chat-session/${sessionId}/test?count=${count}`,
      {},
      { withCredentials: true },
    );
  }

  public evaluateAnswer(sessionId: number, body: EvaluateRequestDTO): Observable<EvaluateDTO> {
    return this.httpClient.post<EvaluateDTO>(
      `${this.url}/api/Chat/chat-session/${sessionId}/evaluate`,
      body,
      { withCredentials: true },
    );
  }

  public getStudySets(sessionId: number): Observable<SessionStudySetsDTO> {
    return this.httpClient.get<SessionStudySetsDTO>(
      `${this.url}/api/Chat/chat-session/${sessionId}/study-sets`,
      { withCredentials: true },
    );
  }

  public deleteStudySet(sessionId: number, studySetId: number): Observable<void> {
    return this.httpClient.delete<void>(
      `${this.url}/api/Chat/chat-session/${sessionId}/study-set/${studySetId}`,
      { withCredentials: true },
    );
  }

  public getFlashcardSet(sessionId: number, studySetId: number): Observable<FlashcardSetDTO> {
    return this.httpClient.get<FlashcardSetDTO>(
      `${this.url}/api/Chat/chat-session/${sessionId}/flashcard-set/${studySetId}`,
      { withCredentials: true },
    );
  }

  public getTestSet(sessionId: number, studySetId: number): Observable<TestSetDTO> {
    return this.httpClient.get<TestSetDTO>(
      `${this.url}/api/Chat/chat-session/${sessionId}/test-set/${studySetId}`,
      { withCredentials: true },
    );
  }

  public getTestProgress(sessionId: number, studySetId: number): Observable<TestProgressDTO> {
    return this.httpClient.get<TestProgressDTO>(
      `${this.url}/api/Chat/chat-session/${sessionId}/test-set/${studySetId}/progress`,
      { withCredentials: true },
    );
  }

  public saveAttempt(sessionId: number, body: SaveAttemptRequestDTO): Observable<void> {
    return this.httpClient.post<void>(
      `${this.url}/api/Chat/chat-session/${sessionId}/save-attempt`,
      body,
      { withCredentials: true },
    );
  }

  public finishTest(sessionId: number, studySetId: number): Observable<void> {
    return this.httpClient.post<void>(
      `${this.url}/api/Chat/chat-session/${sessionId}/test-set/${studySetId}/finish`,
      {},
      { withCredentials: true },
    );
  }
}
