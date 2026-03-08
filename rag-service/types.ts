import { Document } from "@langchain/core/documents";

/*
 * The flattened metadata stored in Chroma for every chunk/summary.
 * sessionId scopes all chunks to the chat session they belong to;
 * storageKey is the UUID filename used for the physical file on disk;
 */
export interface SanitizedMetadata {
  source: string;
  storageKey: string;
  fileName: string;
  sessionId: number;
  pageNumber: number;
  isSummary: boolean;
  lineFrom?: number;
  lineTo?: number;
  totalPages?: number;
  title?: string;
  [key: string]: string | number | boolean | undefined;
}

/*
 * The structure of a Document chunk after sanitization.
 */
export interface SanitizedDocument extends Document {
  metadata: SanitizedMetadata;
}

/**
 * A single source citation returned for the UI to display citations.
 */
export interface Citation {
  fileName: string;
  page: number | null;
  lineFrom?: number | null;
  lineTo?: number | null;
  snippet: string;
}

/**
 * The final response structure for a retrieval query.
 */
export interface RetrievalResponse {
  fullContext: string;
  sources: Citation[];
}

/**
 * Describes what kind of retrieval the user wants.
 */
export interface QueryIntent {
  type: "summary" | "specific";
  targetFile?: string | null;
}

/**
 * Body sent by .NET to /ingest.
 */
export interface IngestRequest {
  sessionId: number;
  filePath: string;
  fileName: string;
  storageKey: string;
}

/**
 * A single message in the chat history passed to /chat.
 * 1 = User, 2 = Assistant
 */
export interface ChatHistoryMessage {
  role: 1 | 2;
  content: string;
}

/**
 * Body sent by .NET to /chat.
 */
export interface ChatRequest {
  sessionId: number;
  query: string;
  chatHistory: ChatHistoryMessage[];
}

/**
 * Response sent back from /chat to .NET.
 */
export interface AiChatResponse {
  answer: string;
  sources: Citation[];
}

/**
 * Response sent back from /ingest to .NET.
 */
export interface IngestResponse {
  summary: string;
}

/**
 * Body sent by .NET to /flashcards and /test endpoints.
 */
export interface StudyRequest {
  sessionId: number;
  count?: number; // how many cards/questions to generate
}

/**
 * A single flashcard containing a question on the front and answer on the back.
 */
export interface Flashcard {
  front: string;
  back: string;
}

/**
 * Response from /flashcards endpoint.
 */
export interface FlashcardSet {
  flashcards: Flashcard[];
  sources: Citation[];
}

/**
 * One option in a multiple-choice question.
 */
export interface McqOption {
  label: string; // "A", "B", "C", "D"
  text: string;
}

/** 
 * A multiple-choice question. 
 */
export interface McqQuestion {
  kind: "mcq";
  question: string;
  options: McqOption[];
  correctLabel: string; // "A" or "B" or "C" or "D"
  explanation: string;
}

/** 
 * An open-answer question. 
 */
export interface OpenQuestion {
  kind: "open";
  question: string;
  sampleAnswer: string;
}

export type TestQuestion = McqQuestion | OpenQuestion;

/** 
 * Response from /test endpoint. 
 */
export interface TestSet {
  questions: TestQuestion[];
  sources: Citation[];
}

/** 
 * Body sent by .NET to /evaluate endpoint.
 */
export interface EvaluateRequest {
  question: string; // the original open question
  sampleAnswer: string; // the AI-generated sample answer for ref
  studentAnswer: string; // what the student actually wrote
}

/** 
 * Response from /evaluate endpoint. 
 */
export interface EvaluateResponse {
  score: number; // 0-10
  feedback: string; // feedback with explanation of what was correct/missing
  isCorrect: boolean; // correctness flag with score >= 6
}
