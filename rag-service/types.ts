import { Document } from "@langchain/core/documents";

/**
 * The flattened metadata stored in Chroma.
 */
export interface SanitizedMetadata {
  source: string;
  pageNumber: number;
  lineFrom?: number;
  lineTo?: number;
  totalPages?: number;
  title?: string;
  [key: string]: string | number | boolean | undefined; 
}

/**
 * The structure of a Document chunk after sanitization.
 */
export interface SanitizedDocument extends Document {
  metadata: SanitizedMetadata;
}

/**
 * The object returned to .NET backend for the UI to display citations.
 */
export interface Citation {
  fileName: string;
  page: number;
  lineFrom?: number;
  lineTo?: number;
  snippet: string;
}

/**
 * The final response structure for a retrieval.
 */
export interface RetrievalResponse {
  fullContext: string;
  sources: Citation[];
}