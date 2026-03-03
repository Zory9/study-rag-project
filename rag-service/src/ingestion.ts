import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatOpenAI } from "@langchain/openai";
import type { SanitizedDocument } from "../types.js";

// Loads document based on its extension.
export async function loadByExtension(filePath: string): Promise<any[]> {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return new PDFLoader(filePath).load();
    case "txt": return new TextLoader(filePath).load();
    case "docx": return new DocxLoader(filePath).load();
    default: throw new Error(`Unsupported format: ${ext}`);
  }
}

// Splits raw documents into overlapping chunks for embedding.
export async function splitDocuments(
  documents: any[],
  chunkSize = 800,
  chunkOverlap = 50,
): Promise<any[]> {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
  return splitter.splitDocuments(documents);
}


// Overlays session-scoped metadata on chunks 
// also strips non-primitive values that chroma can't store (prevents chroma errors).
export function sanitizeChunks(
  chunks: any[],
  fileName: string,
  storageKey: string,
  sessionId: number,
): SanitizedDocument[] {
  return chunks.map((chunk) => {
    const extracted = {
      // session-scoped fields
      source: fileName,
      fileName: fileName,
      storageKey: storageKey,
      sessionId: sessionId,
      isSummary: false,
      // page/line location
      pageNumber: chunk.metadata.loc?.pageNumber ?? chunk.metadata.page ?? 1,
      lineFrom: chunk.metadata.loc?.lines?.from,
      lineTo: chunk.metadata.loc?.lines?.to,
      // PDF-specific extra metadata
      totalPages: chunk.metadata.pdf?.totalPages,
      title: chunk.metadata.pdf?.info?.Title,
    };

    // Merge extracted chunks on top of raw chunk metadata 
    // and strip non-primitive values
    const combined = { ...chunk.metadata, ...extracted };
    const cleaned = sanitizeMetadata(combined);

    return { ...chunk, metadata: cleaned } as SanitizedDocument;
  });
}

// Generate in advance a document summary stored as a special
// chunk (isSummary=true) so retrieval can fetch it 
// when user intent is for an overview.
export async function generateSummary(
  docs: any[],
  fileName: string,
  storageKey: string,
  sessionId: number,
  model: ChatOpenAI,
): Promise<SanitizedDocument> {
  const fullText = docs.map((d) => d.pageContent).join("\n");
  const response = await model.invoke(
    `Summarize this document for a student in the document's original language:\n\n${fullText}`,
  );

  return {
    pageContent: response.content as string,
    metadata: sanitizeMetadata({
      source: fileName,
      fileName: fileName,
      storageKey: storageKey,
      sessionId: sessionId,
      isSummary: true,
      pageNumber: 0,
      title: `Summary of ${fileName}`,
    }) as SanitizedDocument["metadata"],
  };
}

// Strips any non-primitive value (objects, arrays, null, undefined) from a
// metadata object so chroma never receives a value it cannot store.
function sanitizeMetadata(raw: Record<string, unknown>): SanitizedDocument["metadata"] {
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([, v]) =>
        (typeof v === "string" || typeof v === "number" || typeof v === "boolean") &&
        v !== null &&
        v !== undefined,
    ),
  ) as SanitizedDocument["metadata"];
}