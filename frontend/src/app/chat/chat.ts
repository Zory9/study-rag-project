import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { guid } from '@progress/kendo-angular-common';
import {
  KENDO_CONVERSATIONALUI,
  Message,
  MessageSettings,
  SendMessageEvent,
  User,
} from '@progress/kendo-angular-conversational-ui';
import { KENDO_ICONS } from '@progress/kendo-angular-icons';
import { KENDO_INDICATORS } from '@progress/kendo-angular-indicators';
import { KENDO_DIALOGS } from '@progress/kendo-angular-dialog';
import { KENDO_LABEL } from '@progress/kendo-angular-label';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { IntlService } from '@progress/kendo-angular-intl';
import {
  DrawerComponent,
  DrawerItem,
  DrawerSelectEvent,
  KENDO_LAYOUT,
} from '@progress/kendo-angular-layout';
import {
  plusIcon,
  trashIcon,
  xIcon,
  SVGIcon,
  caretAltUpIcon,
  caretAltDownIcon,
  documentManagerIcon,
  paperclipIcon,
} from '@progress/kendo-svg-icons';
import { Router } from '@angular/router';
import { ChatService } from '../chat-service/chat.service';
import { UserService } from '../user-service/user';
import { ChatSessionDTO, MessageSourceDTO, StudyDocumentDTO } from '../@backend/models/chat';
import { User as AppUser } from '../@backend/models/user';
import { sidebarIcon, pencilIcon } from '../icons';

interface RagMessage extends Message {
  sources?: MessageSourceDTO[];
  sourcesExpanded?: boolean;
}

interface SessionData {
  id: number;
  title: string;
  messages: RagMessage[];
  attachedDocs: StudyDocumentDTO[];
}

@Component({
  selector: 'app-chat',
  imports: [
    CommonModule,
    FormsModule,
    KENDO_LAYOUT,
    KENDO_CONVERSATIONALUI,
    KENDO_BUTTONS,
    KENDO_ICONS,
    KENDO_INDICATORS,
    KENDO_DIALOGS,
    KENDO_LABEL,
    KENDO_INPUTS,
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
  encapsulation: ViewEncapsulation.None,
})
export class Chat implements OnInit, OnDestroy {
  @ViewChild('drawer') public drawer!: DrawerComponent;

  public localUser: User = { id: 1, name: 'You' };
  public botUser: User = { id: 2, name: 'RagBuddy' };

  public receiverSettings: MessageSettings = {
    messageWidthMode: 'full',
  };

  public currentUser: AppUser | null = null;

  public sessions: SessionData[] = [];
  public activeSessionId: number | null = null;

  public drawerExpanded = true;
  public drawerItems: DrawerItem[] = [];
  public drawerMode: 'push' | 'overlay' = 'push';
  public drawerMini = true;

  public showNewSessionDialog = false;
  public newSessionTitle = '';

  public isUploading = false;
  public confirmDeleteSession = false;
  public sessionToDeleteId: number | null = null;

  public pencilIcon: SVGIcon = pencilIcon;
  public trashIcon: SVGIcon = trashIcon;
  public plusIcon: SVGIcon = plusIcon;
  public xIcon: SVGIcon = xIcon;
  public expandIcon: SVGIcon = caretAltUpIcon;
  public collapseIcon: SVGIcon = caretAltDownIcon;
  public sidebarIcon: SVGIcon = sidebarIcon;
  public docIcon: SVGIcon = documentManagerIcon;
  public attachIcon: SVGIcon = paperclipIcon;

  constructor(
    public intl: IntlService,
    private chatService: ChatService,
    private userService: UserService,
    private router: Router,
  ) {}

  public async ngOnInit(): Promise<void> {
    this.currentUser = await this.userService.getUser();
    this.updateDrawerMode();
    window.addEventListener('resize', this.onWindowResize);

    const chatSessions: ChatSessionDTO[] = await this.chatService.getSessions();
    this.sessions = chatSessions.map((d) => ({
      id: d.id,
      title: d.title,
      messages: [],
      attachedDocs: [],
    }));
    this.updateDrawerItems();

    if (this.sessions.length > 0) {
      await this.loadSession(this.sessions[0].id);
    }
  }

  public ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
  }

  public get activeSession(): SessionData | undefined {
    return this.sessions.find((s) => s.id === this.activeSessionId);
  }

  public get currentMessages(): RagMessage[] {
    return this.activeSession?.messages ?? [];
  }

  public get attachedDocs(): StudyDocumentDTO[] {
    return this.activeSession?.attachedDocs ?? [];
  }

  public onWindowResize = (): void => this.updateDrawerMode();

  public updateDrawerMode(): void {
    if (window.innerWidth > 768) {
      this.drawerMode = 'push';
      this.drawerMini = true;
    } else {
      this.drawerMode = 'overlay';
      this.drawerMini = false;
      this.drawerExpanded = false;
    }
  }

  public toggleDrawer(): void {
    this.drawer.toggle();
  }

  public onDrawerSelect(event: DrawerSelectEvent): void {
    const id = event.item?.id as number | undefined;
    if (id != null) this.loadSession(id);
    if (this.drawerMode === 'overlay') this.drawer.toggle();
  }

  public onSessionClick(session: SessionData): void {
    this.loadSession(session.id);
    if (this.drawerMode === 'overlay' && this.drawerExpanded) this.drawer.toggle();
  }

  public updateDrawerItems(): void {
    this.drawerItems = this.sessions.map((s) => ({
      id: s.id,
      text: s.title,
      selected: s.id === this.activeSessionId,
    }));
  }

  public async loadSession(id: number): Promise<void> {
    this.activeSessionId = id;
    const existing = this.sessions.find((s) => s.id === id)!;
    if (existing.messages.length === 0) {
      const detail = await this.chatService.getSessionDetail(id);
      if (detail) {
        existing.messages = detail.messages.map((m) => ({
          id: guid(),
          author: m.role === 1 ? this.localUser : this.botUser,
          text: m.content,
          timestamp: new Date(m.dateCreated),
          status: 'Delivered',
          sources: m.sources,
          sourcesExpanded: false,
        }));

        existing.attachedDocs = detail.attachedDocuments;
      }
    }
    this.updateDrawerItems();
  }

  public openNewSessionDialog(): void {
    this.newSessionTitle = '';
    this.showNewSessionDialog = true;
    if (this.drawerMode === 'overlay' && this.drawerExpanded) this.drawer.toggle();
  }

  public async confirmNewSession(): Promise<void> {
    const title = this.newSessionTitle.trim() || 'New session';
    this.showNewSessionDialog = false;
    const dto = await this.chatService.createSession(title);
    if (!dto) return;
    const newSession: SessionData = {
      id: dto.id,
      title: dto.title,
      messages: [],
      attachedDocs: [],
    };
    this.sessions = [newSession, ...this.sessions];
    this.activeSessionId = dto.id;
    this.updateDrawerItems();
  }

  public get sessionToDeleteTitle(): string {
    return this.sessions.find((s) => s.id === this.sessionToDeleteId)?.title ?? '';
  }

  public openDeleteSessionDialog(event: Event, sessionId: number): void {
    event.stopPropagation();
    this.sessionToDeleteId = sessionId;
    this.confirmDeleteSession = true;
  }

  public async deleteSession(): Promise<void> {
    if (this.sessionToDeleteId == null) return;

    const id = this.sessionToDeleteId;
    this.confirmDeleteSession = false;
    this.sessionToDeleteId = null;

    const ok = await this.chatService.deleteSession(id);
    if (!ok) return;

    this.sessions = this.sessions.filter((s) => s.id !== id);
    if (this.activeSessionId === id) {
      this.activeSessionId = this.sessions[0]?.id ?? null;
      if (this.activeSessionId) await this.loadSession(this.activeSessionId);
    }
    this.updateDrawerItems();
  }

  public async onSendMessage(event: SendMessageEvent): Promise<void> {
    const text = event.message.text?.trim() ?? '';
    if (!text || !this.activeSessionId) return;

    const session = this.activeSession!;

    const userMsg: RagMessage = {
      id: guid(),
      author: this.localUser,
      text,
      timestamp: new Date(),
      status: 'delivered',
    };
    session.messages = [...session.messages, userMsg];

    const typingMsg: RagMessage = {
      id: guid(),
      author: this.botUser,
      typing: true,
      timestamp: new Date(),
      status: 'delivered',
    };
    session.messages = [...session.messages, typingMsg];

    const reply = await this.chatService.askQuestion(this.activeSessionId, text);

    const botMsg: RagMessage = {
      id: guid(),
      author: this.botUser,
      text: reply?.content ?? 'Sorry, something went wrong.',
      timestamp: new Date(),
      status: 'delivered',
      sources: reply?.sources ?? [],
      sourcesExpanded: false,
    };

    session.messages = [...session.messages.filter((m) => !m.typing), botMsg];
  }

  public toggleSources(msg: RagMessage): void {
    msg.sourcesExpanded = !msg.sourcesExpanded;
    const session = this.activeSession;
    if (session) session.messages = [...session.messages];
  }

  public triggerFileInput(): void {
    (document.getElementById('hidden-file-input') as HTMLInputElement).click();
  }

  public async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.activeSessionId) return;
    const file = input.files[0];
    input.value = '';
    this.isUploading = true;
    const doc = await this.chatService.uploadToSession(this.activeSessionId, file);
    this.isUploading = false;
    if (doc && this.activeSession) {
      this.activeSession.attachedDocs = [...this.activeSession.attachedDocs, doc];
    }
  }

  public async logout(): Promise<void> {
    await this.userService.logout();
    this.router.navigate(['/signup']);
  }
}
