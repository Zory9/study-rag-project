import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { JSONLoader } from "@langchain/classic/document_loaders/fs/json";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import type { Document } from "@langchain/core/documents";
import type { SanitizedDocument } from "../types.js";

// Loads a document from disk based on its file extension.
export async function loadByExtension(filePath: string): Promise<Document[]> {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":  return new PDFLoader(filePath).load();
    case "docx":
    case "doc":  return new DocxLoader(filePath).load();
    case "pptx": return new PPTXLoader(filePath).load();
    case "epub": return new EPubLoader(filePath).load();
    case "csv":  return new CSVLoader(filePath).load();
    case "tsv":  return new CSVLoader(filePath, { column: undefined, separator: "\t" } as any).load();
    case "json": return new JSONLoader(filePath).load();
    case "txt":
    case "md":
    case "mdx":  return new TextLoader(filePath).load();
    default:
      throw new Error(
        `Unsupported file format ".${ext}". Supported: pdf, docx, doc, pptx, epub, csv, tsv, json, txt, md, mdx`,
      );
  }
}

// Splits raw documents into overlapping chunks using separators
// that respect natural text boundaries
export async function splitDocuments(
  documents: Document[],
  chunkSize = 1000,
  chunkOverlap = 150,
): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    // Separator list so the splitter prefers structural boundaries
    // over arbitrary character counts.
    separators: ["\n\n\n", "\n\n", "\n", ". ", "? ", "! ", " ", ""],
  });
  return splitter.splitDocuments(documents);
}


// Overlays session-scoped metadata on chunks 
// also strips non-primitive values that chroma can't store (prevents chroma errors).
export function sanitizeChunks(
  chunks: Document[],
  fileName: string,
  storageKey: string,
  sessionId: number,
): SanitizedDocument[] {
  return chunks.map((chunk) => {
    const extracted = {
      // session-scoped fields
      source: fileName,
      fileName,
      storageKey,
      sessionId,
      isSummary: false,
      // page/line location
      pageNumber: chunk.metadata.loc?.pageNumber ?? chunk.metadata.page ?? 1,
      lineFrom: chunk.metadata.loc?.lines?.from,
      lineTo: chunk.metadata.loc?.lines?.to,
      // PDF-specific extra metadata
      totalPages: chunk.metadata.pdf?.totalPages,
      title: chunk.metadata.pdf?.info?.Title,
    };

    const combined = { ...chunk.metadata, ...extracted };
    return { ...chunk, metadata: sanitizeMetadata(combined) } as SanitizedDocument;
  });
}

// Generate in advance a document summary stored as a special
// chunk (isSummary=true) so retrieval can fetch it 
// when user intent is for an overview of individual document.
export async function generateSummary(
  docs: Document[],
  fileName: string,
  storageKey: string,
  sessionId: number,
): Promise<SanitizedDocument> {
   const fullText = docs.map((d) => d.pageContent).join("\n\n");

  const miniModel = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });
  const prompt = PromptTemplate.fromTemplate(
    `You are summarising an academic document called "{fileName}" for a study assistant.\n\n` +
    `Write a comprehensive summary (3-5 paragraphs) in the document's original language.\n` +
    `Cover all main topics, key facts, definitions and conclusions.\n\n` +
    `DOCUMENT CONTENT:\n{content}\n\nSUMMARY:`,
  );

  const response = await miniModel.invoke(
    await prompt.format({ fileName, content: fullText }),
  );

  return {
    pageContent: response.content as string,
    metadata: sanitizeMetadata({
      source: fileName,
      fileName,
      storageKey,
      sessionId,
      isSummary: true,
      pageNumber: 0,
      totalPages: docs.length,
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