import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { loadByExtension, splitDocuments, sanitizeChunks, generateSummary } from "./ingestion.js";
import { runRetrieval } from "./retrieval.js";
import { getQueryIntent, rewriteQueryWithHistory, generateAnswer } from "./answer-generation.js";
import type { AiChatResponse, ChatHistoryMessage } from "../types.js";

export class DocumentProcessor {
  private model: ChatOpenAI;
  private vectorStore: Chroma;

  constructor() {
    this.model = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 });
    this.vectorStore = new Chroma(
      new OpenAIEmbeddings({
        apiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
      }),
      {
        collectionName: "my_document_collection",
        url: process.env.CHROMA_URL ?? "http://localhost:8000",
        collectionMetadata: { "hnsw:space": "cosine" },
      },
    );
  }

  // Processes a single uploaded file and stores it in chroma.
  async processAndIngest(
    filePath: string,
    fileName: string,
    storageKey: string,
    sessionId: number,
  ): Promise<string> {
    console.log(`ingest "${fileName}", session ${sessionId}`);

    // Load raw pages from the file based on extension
    const rawDocs = await loadByExtension(filePath);

    // Generate and store a summary chunk (for summary user intent)
    const summaryDoc = await generateSummary(rawDocs, fileName, storageKey, sessionId, this.model);
    await this.vectorStore.addDocuments([summaryDoc]);

    // Split into overlapping chunks, sanitize metadata, store in chroma
    const chunks = await splitDocuments(rawDocs);
    const sanitized = sanitizeChunks(chunks, fileName, storageKey, sessionId);
    await this.vectorStore.addDocuments(sanitized);

    console.log(`ingest done: ${sanitized.length} chunks + 1 summary`);
    return summaryDoc.pageContent;
  }

  // Handles a single chat message - rewrites query for multi-turn context,
  // classifies user intent, retrieves chunks scoped to chat session and
  // generates the final answer
  async chat(
    query: string,
    sessionId: number,
    chatHistory: ChatHistoryMessage[],
  ): Promise<AiChatResponse> {
    const standaloneQuery = await rewriteQueryWithHistory(query, chatHistory, this.model);
    const intent = await getQueryIntent(standaloneQuery, this.model);
    const retrievalResult = await runRetrieval(standaloneQuery, sessionId, intent, this.vectorStore);

    if (typeof retrievalResult === "string") {
      return { answer: retrievalResult, sources: [] };
    }

    return generateAnswer(retrievalResult, query, chatHistory, this.model);
  }
}