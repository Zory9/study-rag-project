import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { ChatMessageDTO, ChatSessionDetailDTO, ChatSessionDTO, StudyDocumentDTO } from '../models/chat';

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
}
