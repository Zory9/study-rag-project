export interface ChatSessionDTO {
  id: number;
  title: string;
  dateCreated: string;
}

export interface MessageSourceDTO {
  fileName: string;
  page?: number;
  lineFrom?: number;
  lineTo?: number;
  snippet?: string;
}

export interface ChatMessageDTO {
  role: number; // 1 = User, 2 = Assistant
  content: string;
  dateCreated: string;
  sources: MessageSourceDTO[];
}

export interface StudyDocumentDTO {
  id: number;
  fileName: string;
  fileSummary?: string;
  dateCreated: string;
}

export interface ChatSessionDetailDTO {
  id: number;
  title: string;
  messages: ChatMessageDTO[];
  attachedDocuments: StudyDocumentDTO[];
}

// Matches backend StudySetSourceDTO
export interface StudySetSourceDTO {
  fileName: string;
  page?: number | null;
  lineFrom?: number | null;
  lineTo?: number | null;
  snippet?: string | null;
}

// Matches backend FlashcardDTO
export interface FlashcardDTO {
  id: number;
  front: string;
  back: string;
}

// Matches backend FlashcardSetDTO
export interface FlashcardSetDTO {
  studySetId: number;
  dateCreated: string;
  flashcards: FlashcardDTO[];
  sources: StudySetSourceDTO[];
}

// Matches backend McqOptionDTO
export interface McqOptionDTO {
  label: string;
  text: string;
}

// Matches backend TestQuestionDTO
// kind is 'mcq' or 'open'; optional fields are null for the inapplicable kind.
export interface TestQuestionDTO {
  id: number;
  kind: 'mcq' | 'open';
  question: string;
  // MCQ only (null for open)
  options: McqOptionDTO[] | null;
  correctLabel: string | null;
  explanation: string | null;
  // Open only (null for mcq)
  sampleAnswer: string | null;
}

// Matches backend TestSetDTO
export interface TestSetDTO {
  studySetId: number;
  dateCreated: string;
  questions: TestQuestionDTO[];
  sources: StudySetSourceDTO[];
}

// Matches backend EvaluateRequest record: EvaluateRequest(int StudySetId, int QuestionId, string StudentAnswer)
export interface EvaluateRequestDTO {
  studySetId: number;
  questionId: number;
  studentAnswer: string;
}

// Matches backend EvaluateDTO
export interface EvaluateDTO {
  score: number;     // 0-10
  feedback: string;
  isCorrect: boolean;
}

// Matches backend StudySetSummaryDTO
export interface StudySetSummaryDTO {
  studySetId: number;
  kind: 'flashcards' | 'test';
  dateCreated: string;
  itemCount: number;
  answeredCount: number;  // 0 for flashcard sets
  isFinished: boolean;    // true once the student finishes the whole test
}

// Matches backend SessionStudySetsDTO
export interface SessionStudySetsDTO {
  items: StudySetSummaryDTO[];
}

// Matches backend TestQuestionAttemptDTO
export interface TestQuestionAttemptDTO {
  questionId: number;
  selectedLabel: string | null;   // MCQ only
  studentAnswer: string | null;   // open only
  isCorrect: boolean;
  score: number;
  feedback: string | null;
}

// Matches backend TestProgressDTO
export interface TestProgressDTO {
  isFinished: boolean;
  attempts: TestQuestionAttemptDTO[];
}

// Matches backend SaveAttemptRequest
export interface SaveAttemptRequestDTO {
  studySetId: number;
  questionId: number;
  selectedLabel?: string | null;
  studentAnswer?: string | null;
  isCorrect: boolean;
  score: number;
  feedback?: string | null;
}
