import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_ICONS } from '@progress/kendo-angular-icons';
import {
  SVGIcon,
  arrowRotateCwIcon,
  chevronLeftIcon,
  chevronRightIcon,
} from '@progress/kendo-svg-icons';
import { FlashcardSetState } from '../@backend/models/study';
import { FlashcardDTO } from '../@backend/models/chat';

@Component({
  selector: 'app-flashcard-viewer',
  standalone: true,
  imports: [CommonModule, KENDO_BUTTONS, KENDO_ICONS],
  templateUrl: './flashcard-viewer.html',
  styleUrl: './flashcard-viewer.css',
  encapsulation: ViewEncapsulation.None,
})
export class FlashcardViewer {
  @Input({ required: true }) public set!: FlashcardSetState;
  @Input() public cardIndex = 0;
  @Input() public cardFlipped = false;

  @Output() public backClicked = new EventEmitter<void>();
  @Output() public cardIndexChange = new EventEmitter<number>();
  @Output() public cardFlippedChange = new EventEmitter<boolean>();

  public flipIcon: SVGIcon = arrowRotateCwIcon;
  public prevIcon: SVGIcon = chevronLeftIcon;
  public nextIcon: SVGIcon = chevronRightIcon;

  public get currentCard(): FlashcardDTO | null {
    return this.set?.cards[this.cardIndex] ?? null;
  }

  public flip(): void {
    this.cardFlippedChange.emit(!this.cardFlipped);
  }

  public prev(): void {
    if (this.cardIndex > 0) {
      this.cardIndexChange.emit(this.cardIndex - 1);
      this.cardFlippedChange.emit(false);
    }
  }

  public next(): void {
    const max = (this.set?.cards.length ?? 1) - 1;
    if (this.cardIndex < max) {
      this.cardIndexChange.emit(this.cardIndex + 1);
      this.cardFlippedChange.emit(false);
    }
  }
}
