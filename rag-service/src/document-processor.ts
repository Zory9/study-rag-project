import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { loadByExtension, splitDocuments, sanitizeChunks, generateSummary } from "./ingestion.js";
import { runRetrieval } from "./retrieval.js";
import { getQueryIntent, rewriteQueryWithHistory, generateAnswer, generateMultiDocSummary, generateFlashcards, generateTest, evaluateOpenAnswer } from "./answer-generation.js";
import type { AiChatResponse, ChatHistoryMessage, FlashcardSet, TestSet, EvaluateResponse } from "../types.js";

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

    // Split into overlapping chunks and sanitize metadata
    const chunks = await splitDocuments(rawDocs);
    const sanitized = sanitizeChunks(chunks, fileName, storageKey, sessionId);

    // Generate and store a summary chunk (for summary user intent)
    const [summaryDoc] = await Promise.all([
      generateSummary(rawDocs, fileName, storageKey, sessionId),
      this.vectorStore.addDocuments(sanitized),
    ]);
    await this.vectorStore.addDocuments([summaryDoc]);

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

    if (intent.type === "summary" && !intent.targetFile) {
      return generateMultiDocSummary(retrievalResult, query, this.model);
    }

    return generateAnswer(retrievalResult, query, chatHistory, this.model);
  }

  // Generates flashcards from the session's material.
  async flashCards(sessionId: number, count = 10): Promise<FlashcardSet> {
    const intent = { type: "specific" as const, targetFile: null };
    const query = "key concepts, definitions and important facts";
    const retrievalResult = await runRetrieval(query, sessionId, intent, this.vectorStore);

    if (typeof retrievalResult === "string") {
      return { flashcards: [], sources: [] };
    }

    return generateFlashcards(retrievalResult, count, this.model);
  }

  // Generates a mixed test from the session's material.
  async test(sessionId: number, count = 10): Promise<TestSet> {
    const intent = { type: "specific" as const, targetFile: null };
    const query = "key concepts, definitions, facts and reasoning questions";
    const retrievalResult = await runRetrieval(query, sessionId, intent, this.vectorStore);

    if (typeof retrievalResult === "string") {
      return { questions: [], sources: [] };
    }

    return generateTest(retrievalResult, count, this.model);
  }

  // Evaluates a student's open-answer response using the LLM model.
  async evaluateAnswer(
    question: string,
    sampleAnswer: string,
    studentAnswer: string,
  ): Promise<EvaluateResponse> {
    return evaluateOpenAnswer(question, sampleAnswer, studentAnswer, this.model);
  }
}