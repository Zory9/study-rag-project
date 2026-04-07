import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_ICONS } from '@progress/kendo-angular-icons';
import { KENDO_INDICATORS } from '@progress/kendo-angular-indicators';
import { KENDO_DIALOGS } from '@progress/kendo-angular-dialog';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import {
  KENDO_LAYOUT,
  DrawerComponent,
  DrawerItem,
  DrawerSelectEvent,
} from '@progress/kendo-angular-layout';
import {
  SVGIcon,
  clockIcon,
  xIcon,
  bookIcon,
  clipboardTextIcon,
  checkIcon,
  layoutStackedIcon,
  documentManagerIcon,
  lightbulbOutlineIcon,
} from '@progress/kendo-svg-icons';

import { ChatService } from '../chat-service/chat.service';
import { UserService } from '../user-service/user';
import { SessionDrawer } from '../session-drawer/session-drawer';
import { FlashcardViewer } from '../flashcard-viewer/flashcard-viewer';
import { TestViewer } from '../test-viewer/test-viewer';
import {
  ChatSessionDTO,
  StudySetSummaryDTO,
  TestQuestionDTO,
  TestProgressDTO,
} from '../@backend/models/chat';
import {
  FlashcardSetState,
  HistoryEntry,
  QuestionState,
  STUDY_TOOLS,
  TestSetState,
  ToolDef,
  ViewMode,
} from '../@backend/models/study';
import { User as AppUser } from '../@backend/models/user';

interface SessionCache {
  history: HistoryEntry[];
  historyLoaded: boolean;
}

@Component({
  selector: 'app-study',
  imports: [
    CommonModule,
    FormsModule,
    KENDO_LAYOUT,
    KENDO_BUTTONS,
    KENDO_ICONS,
    KENDO_INDICATORS,
    KENDO_DIALOGS,
    KENDO_INPUTS,
    SessionDrawer,
    FlashcardViewer,
    TestViewer,
  ],
  templateUrl: './study.html',
  styleUrl: './study.css',
  encapsulation: ViewEncapsulation.None,
})
export class Study implements OnInit, OnDestroy {
  @ViewChild('drawer') public drawer!: DrawerComponent;

  public currentUser: AppUser | null = null;

  public sessions: ChatSessionDTO[] = [];
  public activeSessionId: number | null = null;
  private sessionCache = new Map<number, SessionCache>();

  public drawerExpanded = true;
  public drawerItems: DrawerItem[] = [];
  public drawerMode: 'push' | 'overlay' = 'push';
  public drawerMini = true;

  public readonly tools: ToolDef[] = STUDY_TOOLS;
  public isGenerating = false;
  public isLoadingHistory = false;
  public generatingToolId: string | null = null;

  public viewMode: ViewMode = 'hub';

  public activeFlashcardSet: FlashcardSetState | null = null;
  public cardIndex = 0;
  public cardFlipped = false;

  public activeTestSet: TestSetState | null = null;
  public questionIndex = 0;

  public historyIcon: SVGIcon = clockIcon;
  public xIcon: SVGIcon = xIcon;
  public bookIcon: SVGIcon = bookIcon;
  public documentManagerIcon: SVGIcon = documentManagerIcon;
  public layoutStackedIcon: SVGIcon = layoutStackedIcon;
  public clipboardTextIcon: SVGIcon = clipboardTextIcon;
  public checkIcon: SVGIcon = checkIcon;
  public bulbIcon: SVGIcon = lightbulbOutlineIcon;

  constructor(
    private chatService: ChatService,
    private userService: UserService,
    private router: Router,
  ) {}

  public async ngOnInit(): Promise<void> {
    this.currentUser = await this.userService.getUser();
    this.updateDrawerMode();
    window.addEventListener('resize', this.onWindowResize);
    this.sessions = await this.chatService.getSessions();
    this.updateDrawerItems();

    if (this.sessions.length > 0) {
      this.activeSessionId = this.sessions[0].id;
      this.updateDrawerItems();
      void this.loadHistoryFromBackend(this.activeSessionId);
    }
  }

  public ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
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
    const id = event.item?.['id'] as number | undefined;
    if (id != null) this.selectSession(id);
    if (this.drawerMode === 'overlay') this.drawer.toggle();
  }

  public selectSession(id: number): void {
    if (id === this.activeSessionId) return;
    this.activeSessionId = id;
    this.viewMode = 'hub';
    this.activeFlashcardSet = null;
    this.activeTestSet = null;
    this.updateDrawerItems();
    void this.loadHistoryFromBackend(id);
  }

  public updateDrawerItems(): void {
    this.drawerItems = this.sessions.map((s) => ({
      id: s.id,
      text: s.title,
      selected: s.id === this.activeSessionId,
    }));
  }

  public get activeSession(): ChatSessionDTO | undefined {
    return this.sessions.find((s) => s.id === this.activeSessionId);
  }

  private ensureCache(sessionId: number): SessionCache {
    if (!this.sessionCache.has(sessionId)) {
      this.sessionCache.set(sessionId, { history: [], historyLoaded: false });
    }
    return this.sessionCache.get(sessionId)!;
  }

  public get history(): HistoryEntry[] {
    if (!this.activeSessionId) return [];
    return this.ensureCache(this.activeSessionId).history;
  }

  private async loadHistoryFromBackend(sessionId: number): Promise<void> {
    const cache = this.ensureCache(sessionId);
    if (cache.historyLoaded) return;

    this.isLoadingHistory = true;
    const data = await this.chatService.getStudySets(sessionId);
    this.isLoadingHistory = false;
    if (!data || sessionId !== this.activeSessionId) return;

    const entries: HistoryEntry[] = data.items.map((item) => this.summaryToHistoryEntry(item));
    cache.history = entries;
    cache.historyLoaded = true;
  }

  private summaryToHistoryEntry(item: StudySetSummaryDTO): HistoryEntry {
    if (item.kind === 'flashcards') {
      const set: FlashcardSetState = {
        id: item.studySetId,
        studySetId: item.studySetId,
        label: 'Flashcards',
        dateCreated: item.dateCreated,
        cards: [], // loaded on demand when opened
      };
      return { kind: 'flashcards', set };
    } else {
      const n = item.itemCount;
      const answered = item.answeredCount;
      const stubLabel = item.isFinished
        ? `Practice Test | Done`
        : `Practice Test | ${answered}/${n} answered`;
      const set: TestSetState = {
        id: item.studySetId,
        studySetId: item.studySetId,
        label: stubLabel,
        dateCreated: item.dateCreated,
        questions: [], // loaded on demand when opened
        finished: item.isFinished,
      };
      return { kind: 'test', set };
    }
  }

  private addToHistory(entry: HistoryEntry): void {
    if (!this.activeSessionId) return;
    this.ensureCache(this.activeSessionId).history.unshift(entry);
  }

  public removeHistory(event: Event, entry: HistoryEntry): void {
    event.stopPropagation();
    if (!this.activeSessionId) return;
    const cache = this.ensureCache(this.activeSessionId);
    cache.history = cache.history.filter((h) => h !== entry);

    if (
      (entry.kind === 'flashcards' && this.activeFlashcardSet === entry.set) ||
      (entry.kind === 'test' && this.activeTestSet === entry.set)
    ) {
      this.backToHub();
    }

    this.chatService.deleteStudySet(this.activeSessionId, entry.set.studySetId);
  }

  public openHistoryEntry(entry: HistoryEntry): void {
    if (entry.kind === 'flashcards') {
      if (entry.set.cards.length === 0) {
        this.loadFullFlashcardSet(entry);
        return;
      }
      this.activeFlashcardSet = entry.set;
      this.cardIndex = 0;
      this.cardFlipped = false;
      this.activeTestSet = null;
      this.viewMode = 'flashcards';
    } else {
      if (entry.set.questions.length === 0) {
        this.loadFullTestSet(entry);
        return;
      }
      this.activeTestSet = entry.set;
      this.activeFlashcardSet = null;
      if (entry.set.finished) {
        this.questionIndex = 0;
      } else {
        const idx = entry.set.questions.findIndex((q) => !q.answered);
        this.questionIndex = idx === -1 ? 0 : idx;
      }
      this.viewMode = 'test';
    }
  }

  private async loadFullFlashcardSet(entry: HistoryEntry & { kind: 'flashcards' }): Promise<void> {
    if (!this.activeSessionId) return;
    this.isGenerating = true;
    this.generatingToolId = 'flashcards';
    const result = await this.chatService.getFlashcardSet(
      this.activeSessionId,
      entry.set.studySetId,
    );
    this.isGenerating = false;
    this.generatingToolId = null;
    if (!result) return;
    entry.set.cards = result.flashcards;
    entry.set.label = 'Flashcards';
    this.activeFlashcardSet = entry.set;
    this.activeTestSet = null;
    this.cardIndex = 0;
    this.cardFlipped = false;
    this.viewMode = 'flashcards';
  }

  private async loadFullTestSet(entry: HistoryEntry & { kind: 'test' }): Promise<void> {
    if (!this.activeSessionId) return;
    this.isGenerating = true;
    this.generatingToolId = 'test';
    const result = await this.chatService.getTestSet(this.activeSessionId, entry.set.studySetId);
    this.isGenerating = false;
    this.generatingToolId = null;
    if (!result) return;
    const questions: QuestionState[] = result.questions.map(
      (q: TestQuestionDTO): QuestionState => ({
        ...q,
        selected: null,
        studentAnswer: '',
        evaluation: null,
        evaluating: false,
        answered: false,
      }),
    );

    const progress = await this.chatService.getTestProgress(
      this.activeSessionId,
      entry.set.studySetId,
    );
    if (progress) {
      this.applyProgress(questions, progress);
      entry.set.finished = progress.isFinished;
    }

    entry.set.questions = questions;
    entry.set.label = 'Practice Test';
    this.activeTestSet = entry.set;
    this.activeFlashcardSet = null;
    // Resume at first unanswered question (or start if finished)
    const firstUnanswered = questions.findIndex((q) => !q.answered);
    this.questionIndex = firstUnanswered === -1 ? 0 : firstUnanswered;
    this.viewMode = 'test';
  }

  private applyProgress(questions: QuestionState[], progress: TestProgressDTO): void {
    for (const attempt of progress.attempts) {
      const q = questions.find((q) => q.id === attempt.questionId);
      if (!q) continue;
      if (q.kind === 'mcq') {
        q.selected = attempt.selectedLabel ?? null;
        q.answered = true;
      } else {
        q.studentAnswer = attempt.studentAnswer ?? '';
        q.evaluation =
          attempt.feedback != null
            ? { score: attempt.score, feedback: attempt.feedback, isCorrect: attempt.isCorrect }
            : null;
        q.answered = attempt.isCorrect !== undefined && q.evaluation != null;
      }
    }
  }

  public historyEntryKind(entry: HistoryEntry): 'flashcards' | 'test' {
    return entry.kind;
  }

  public historyEntryLabel(entry: HistoryEntry): string {
    if (entry.kind === 'flashcards') return entry.set.label;
    const set = entry.set as TestSetState;
    if (set.questions.length > 0) {
      const answered = set.questions.filter((q) => q.answered).length;
      const suffix = set.finished ? 'Done' : `${answered}/${set.questions.length} answered`;
      return `Practice Test | ${suffix}`;
    }
    return set.label;
  }

  public isActiveEntry(entry: HistoryEntry): boolean {
    if (entry.kind === 'flashcards') return this.activeFlashcardSet === entry.set;
    return this.activeTestSet === entry.set;
  }

  public async generateTool(tool: ToolDef): Promise<void> {
    if (!this.activeSessionId || this.isGenerating) return;
    if (tool.id === 'flashcards') await this.doGenerateFlashcards();
    else if (tool.id === 'test') await this.doGenerateTest();
  }

  public onCardIndexChange(i: number): void {
    this.cardIndex = i;
  }
  public onCardFlippedChange(f: boolean): void {
    this.cardFlipped = f;
  }

  public onQuestionIndexChange(i: number): void {
    this.questionIndex = i;
  }

  public onMcqAnswered(event: { q: QuestionState; label: string }): void {
    this.selectMcqOption(event.q, event.label);
  }

  public onOpenSubmitted(q: QuestionState): void {
    void this.submitOpenAnswer(q);
  }

  public onTestFinished(): void {
    if (!this.activeTestSet) return;
    this.activeTestSet.finished = true;
    if (this.activeSessionId) {
      void this.chatService.finishTest(this.activeSessionId, this.activeTestSet.studySetId);
    }
  }

  public onRetryClicked(): void {
    this.restartTest();
  }
  public onNewTestClicked(): void {
    void this.generateTool(this.tools[1]);
  }

  private async doGenerateFlashcards(): Promise<void> {
    this.isGenerating = true;
    this.generatingToolId = 'flashcards';
    const result = await this.chatService.generateFlashcards(this.activeSessionId!);
    this.isGenerating = false;
    this.generatingToolId = null;
    if (!result?.flashcards.length) return;

    const set: FlashcardSetState = {
      id: Date.now(),
      studySetId: result.studySetId,
      label: 'Flashcards',
      dateCreated: result.dateCreated,
      cards: result.flashcards,
    };
    this.addToHistory({ kind: 'flashcards', set });
    this.activeFlashcardSet = set;
    this.cardIndex = 0;
    this.cardFlipped = false;
    this.viewMode = 'flashcards';
  }

  private async doGenerateTest(): Promise<void> {
    this.isGenerating = true;
    this.generatingToolId = 'test';
    const result = await this.chatService.generateTest(this.activeSessionId!);
    this.isGenerating = false;
    this.generatingToolId = null;
    this.isGenerating = false;
    if (!result?.questions.length) return;

    const questions: QuestionState[] = result.questions.map(
      (q): QuestionState => ({
        ...q,
        selected: null,
        studentAnswer: '',
        evaluation: null,
        evaluating: false,
        answered: false,
      }),
    );

    const set: TestSetState = {
      id: Date.now(),
      studySetId: result.studySetId,
      label: `${questions.length} question${questions.length !== 1 ? 's' : ''}`,
      dateCreated: result.dateCreated,
      questions,
      finished: false,
    };
    this.addToHistory({ kind: 'test', set });
    this.activeTestSet = set;
    this.questionIndex = 0;
    this.viewMode = 'test';
  }

  public selectMcqOption(q: QuestionState, label: string): void {
    if (q.answered) return;
    q.selected = label;
    q.answered = true;
    if (this.activeTestSet && this.activeSessionId) {
      const isCorrect = label === q.correctLabel;
      void this.chatService.saveAttempt(this.activeSessionId, {
        studySetId: this.activeTestSet.studySetId,
        questionId: q.id,
        selectedLabel: label,
        isCorrect,
        score: isCorrect ? 10 : 0,
      });
    }
  }

  public async submitOpenAnswer(q: QuestionState): Promise<void> {
    if (
      !this.activeTestSet ||
      !this.activeSessionId ||
      !q.studentAnswer.trim() ||
      q.evaluating ||
      q.answered
    )
      return;
    q.evaluating = true;
    const result = await this.chatService.evaluateAnswer(this.activeSessionId, {
      studySetId: this.activeTestSet.studySetId,
      questionId: q.id,
      studentAnswer: q.studentAnswer,
    });
    q.evaluating = false;
    if (result) {
      q.evaluation = result;
      q.answered = true;
    }
  }

  public restartTest(): void {
    if (!this.activeTestSet) return;
    this.activeTestSet.questions = this.activeTestSet.questions.map((q) => ({
      ...q,
      selected: null,
      studentAnswer: '',
      evaluation: null,
      evaluating: false,
      answered: false,
    }));
    this.activeTestSet.finished = false;
    this.questionIndex = 0;
  }

  public backToHub(): void {
    this.viewMode = 'hub';
    this.activeFlashcardSet = null;
    this.activeTestSet = null;
  }

  public goToChat(): void {
    this.router.navigate(['/chat']);
  }

  public async logout(): Promise<void> {
    await this.userService.logout();
    this.router.navigate(['/signup']);
  }
}
