import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { DocumentProcessor } from "./document-processor.js";
import type { IngestRequest, ChatRequest, IngestResponse, StudyRequest, EvaluateRequest } from "../types.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.RAG_PORT ?? 3100);
const processor = new DocumentProcessor();


// Request for document ingestion 
// (called by ChatService after a file is saved to disk).
app.post("/ingest", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, filePath, fileName, storageKey } = req.body as IngestRequest;

    if (!sessionId || !filePath || !fileName || !storageKey) {
      res.status(400).json({ error: "sessionId, filePath, fileName and storageKey are required." });
      return;
    }

    const summary = await processor.processAndIngest(filePath, fileName, storageKey, sessionId);

    const result: IngestResponse = { summary };
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Request for handling chat messages and retrieving relevant chunks 
// (called by ChatService when the user asks a question).
app.post("/chat", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, query, chatHistory } = req.body as ChatRequest;

    if (!sessionId || !query) {
      res.status(400).json({ error: "sessionId and query are required." });
      return;
    }

    const result = await processor.chat(query, sessionId, chatHistory ?? []);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Generates flashcards from the session's uploaded material.
app.post("/flashcards", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, count } = req.body as StudyRequest;

    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required." });
      return;
    }

    const result = await processor.flashCards(sessionId, count);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Generates a mixed multiple-choice + open-answer test
// from the session's uploaded material.
app.post("/test", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, count } = req.body as StudyRequest;

    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required." });
      return;
    }

    const result = await processor.test(sessionId, count);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Evaluates a student's open-answer response against the reference answer. 
// (multiple choice questions are graded on the client side)
app.post("/evaluate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, sampleAnswer, studentAnswer } = req.body as EvaluateRequest;

    if (!question || !sampleAnswer || !studentAnswer) {
      res.status(400).json({ error: "question, sampleAnswer and studentAnswer are required." });
      return;
    }

    const result = await processor.evaluateAnswer(question, sampleAnswer, studentAnswer);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("RAG server error", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`RAG service listening on http://localhost:${PORT}`);
});
