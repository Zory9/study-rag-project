import { EvaluateDTO, FlashcardDTO, TestQuestionDTO } from './chat';

export interface ToolDef {
  id: string;
  label: string;
  description: string;
}

export const STUDY_TOOLS: ToolDef[] = [
  {
    id: 'flashcards',
    label: 'Flashcards',
    description: 'Review key concepts with flip cards generated from your documents.',
  },
  {
    id: 'test',
    label: 'Practice Test',
    description: 'Mixed multiple-choice & open questions with instant AI feedback.',
  },
];

export type ViewMode = 'hub' | 'flashcards' | 'test';

// Extends the flat TestQuestionDTO with UI-only fields added at runtime.
export interface QuestionState extends TestQuestionDTO {
  selected: string | null;
  studentAnswer: string;
  evaluation: EvaluateDTO | null;
  evaluating: boolean;
  answered: boolean;
}

export interface FlashcardSetState {
  id: number;          
  studySetId: number; 
  label: string;
  dateCreated: string;
  cards: FlashcardDTO[];
}

export interface TestSetState {
  id: number;
  studySetId: number;
  label: string;
  dateCreated: string;
  questions: QuestionState[];
  finished: boolean;
}

export type HistoryEntry =
  | { kind: 'flashcards'; set: FlashcardSetState }
  | { kind: 'test'; set: TestSetState };
