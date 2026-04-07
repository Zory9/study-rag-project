import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_ICONS } from '@progress/kendo-angular-icons';
import { KENDO_INDICATORS } from '@progress/kendo-angular-indicators';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import {
  SVGIcon,
  chevronLeftIcon,
  checkIcon,
  xIcon,
} from '@progress/kendo-svg-icons';
import { QuestionState, TestSetState } from '../@backend/models/study';

@Component({
  selector: 'app-test-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, KENDO_BUTTONS, KENDO_ICONS, KENDO_INDICATORS, KENDO_INPUTS],
  templateUrl: './test-viewer.html',
  styleUrl: './test-viewer.css',
  encapsulation: ViewEncapsulation.None,
})
export class TestViewer {
  @Input({ required: true }) public set!: TestSetState;
  @Input() public questionIndex = 0;

  @Output() public backClicked = new EventEmitter<void>();
  @Output() public questionIndexChange = new EventEmitter<number>();
  @Output() public mcqAnswered = new EventEmitter<{ q: QuestionState; label: string }>();
  @Output() public openSubmitted = new EventEmitter<QuestionState>();
  @Output() public testFinished = new EventEmitter<void>();
  @Output() public retryClicked = new EventEmitter<void>();
  @Output() public newTestClicked = new EventEmitter<void>();

  public prevIcon: SVGIcon = chevronLeftIcon;
  public checkIcon: SVGIcon = checkIcon;
  public xIcon: SVGIcon = xIcon;

  public get currentQuestion(): QuestionState | null {
    return this.set?.questions[this.questionIndex] ?? null;
  }

  public get answeredCount(): number {
    return (this.set?.questions ?? []).filter((q: QuestionState) => q.answered).length;
  }

  public get testScore(): number {
    let n = 0;
    for (const q of this.set?.questions ?? []) {
      if (q.kind === 'mcq' && q.answered && q.selected === q.correctLabel) n++;
      if (q.kind === 'open' && q.answered && q.evaluation?.isCorrect) n++;
    }
    return n;
  }

  public isMcq(q: QuestionState | null): boolean { return q?.kind === 'mcq'; }
  public isOpen(q: QuestionState | null): boolean { return q?.kind === 'open'; }

  public mcqOptionClass(q: QuestionState, label: string): string {
    if (!q.answered) return label === q.selected ? 'option selected' : 'option';
    if (label === q.correctLabel) return 'option correct';
    if (label === q.selected && label !== q.correctLabel) return 'option wrong';
    return 'option';
  }

  public selectOption(q: QuestionState, label: string): void {
    if (q.answered) return;
    this.mcqAnswered.emit({ q, label });
  }

  public submitOpen(q: QuestionState): void {
    if (!q.studentAnswer.trim() || q.evaluating || q.answered) return;
    this.openSubmitted.emit(q);
  }

  public prev(): void {
    if (this.questionIndex > 0) this.questionIndexChange.emit(this.questionIndex - 1);
  }

  public next(): void {
    if (!this.set) return;
    if (this.questionIndex < this.set.questions.length - 1) {
      this.questionIndexChange.emit(this.questionIndex + 1);
    } else {
      this.testFinished.emit();
    }
  }

  public isQuestionCorrect(q: QuestionState): boolean {
    return (q.kind === 'mcq' && q.selected === q.correctLabel) ||
           (q.kind === 'open' && !!q.evaluation?.isCorrect);
  }

  public isQuestionWrong(q: QuestionState): boolean {
    return (q.kind === 'mcq' && q.answered && q.selected !== q.correctLabel) ||
           (q.kind === 'open' && q.answered && !q.evaluation?.isCorrect);
  }
}
