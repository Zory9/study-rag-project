import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatOpenAI } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import type { SanitizedDocument, SanitizedMetadata } from "../types.js";

export class DocumentProcessor {
  private splitter: RecursiveCharacterTextSplitter;
  private model: ChatOpenAI;

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 50,
    });
    this.model = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 });
  }

  /**
   * Main entry point: Processes any supported file and adds it to Chroma
   */
  async processAndIngest(filePath: string, vectorStore: Chroma) {
    console.log(`Processing file: ${filePath}`);

    // 1. Load documents based on extension
    const rawDocs = await this.loadByExtension(filePath);

    // 2. Generate and add a Global Summary
    const summaryDoc = await this.generateSummary(rawDocs, filePath);
    await vectorStore.addDocuments([summaryDoc]);

    // 3. Chunk and Sanitize individual snippets
    const chunks = await this.splitter.splitDocuments(rawDocs);
    const sanitizedChunks = this.sanitize(chunks);
    
    await vectorStore.addDocuments(sanitizedChunks);

    console.log(`Successfully ingested ${filePath}`);
  }

  private async loadByExtension(path: string) {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case "pdf": return new PDFLoader(path).load();
      case "txt": return new TextLoader(path).load();
      case "docx": return new DocxLoader(path).load();
      default: throw new Error(`Unsupported format: ${ext}`);
    }
  }

  private async generateSummary(docs: any[], path: string): Promise<SanitizedDocument> {
    const fullText = docs.map(d => d.pageContent).join("\n");
    const response = await this.model.invoke(
      `Summarize this document for a student in the document's original language: ${fullText}`
    );

    return {
      pageContent: response.content as string,
      metadata: {
        source: path,
        shortName: path.split(/[\\/]/).pop() || "Unknown",
        isSummary: true,
        pageNumber: 1
      }
    };
  }

  private sanitize(chunks: any[]): SanitizedDocument[] {
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        source: chunk.metadata.source,
        isSummary: false,
        shortName: chunk.metadata.source?.split(/[\\/]/).pop() || "Unknown",
        pageNumber: chunk.metadata.loc?.pageNumber || chunk.metadata.page || 1,
        lineFrom: chunk.metadata.loc?.lines?.from,
        lineTo: chunk.metadata.loc?.lines?.to
      }
    }));
  }
}