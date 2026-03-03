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
 * 0 = User, 1 = Assistant
 */
export interface ChatHistoryMessage {
  role: 0 | 1;
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