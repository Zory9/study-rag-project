import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import type { QueryIntent, AiChatResponse, ChatHistoryMessage, RetrievalResponse, FlashcardSet, Flashcard, TestSet, TestQuestion, EvaluateResponse } from "../types.js";

// Determines user intent - whether user wants a summary or specific detail.
// Also, extracts the target file name (if mentioned) to narrow down retrieval.
export async function getQueryIntent(
  query: string,
  model: ChatOpenAI,
): Promise<QueryIntent> {
  const response = await model.invoke(`
    Analyze this query: "${query}"

    1. Type: Choose ONLY "summary" if the user is explicitly asking for an overview or summary
       of the entire document or the whole uploaded material (e.g. questions like "summarise the document",
       "what is this document about", "give me an overview of the files").
       For ANY other question - including explanations, definitions, comparisons, how-something-works,
       specific facts, or anything that is not explicitly a request for an overview - respond "specific".
       When in doubt, respond "specific".

    2. Target: If the user mentions a specific file or document name, extract that keyword, otherwise null.

    Respond ONLY with valid JSON - no markdown, no code fences:
    { "type": "summary" | "specific", "targetFile": "keyword" | null }
  `);

  const raw = typeof response.content === "string"
    ? response.content.replace(/```json|```/g, "").trim()
    : JSON.stringify(response.content);

  return JSON.parse(raw) as QueryIntent;
}


// Rewrites the user query when there is conversation history
// into a context-aware standalone query so the embedding model can
// retrieve relevant chunks for ambiguous questions.
export async function rewriteQueryWithHistory(
  latestQuery: string,
  chatHistory: ChatHistoryMessage[],
  model: ChatOpenAI,
): Promise<string> {
  if (chatHistory.length === 0) return latestQuery;

  const historyText = chatHistory
    .slice(-10) // limit to 10 messages to keep tokens manageable
    .map((m) => `${m.role === 1 ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = PromptTemplate.fromTemplate(
    `Given the following conversation history, rewrite the user's latest question as a
    fully self-contained, standalone question that can be understood without any context
    from the conversation. 
    Do NOT answer the question, only rewrite it.
    If the question is already self-contained, return it unchanged.

    Conversation history: {history}\n\n
    User's latest question: "{question}"\n\n
    Standalone question (return only the question text, no quotes, no explanation):`,
  );

  const response = await model.invoke(
    await prompt.format({ history: historyText, question: latestQuery }),
  );

  const rewritten = typeof response.content === "string"
    ? response.content.trim()
    : latestQuery;

  console.log(`rewritten from "${latestQuery}" to "${rewritten}"`);
  return rewritten;
}

// Generates the final answer + relevant sources (if such exist) 
// given the already retrieved context.
export async function generateAnswer(
  context: RetrievalResponse,
  originalQuery: string,
  chatHistory: ChatHistoryMessage[],
  model: ChatOpenAI,
): Promise<AiChatResponse> {
  const historyText = chatHistory.length > 0
    ? chatHistory
        .slice(-10)
        .map((m) => `${m.role === 1 ? "Student" : "Assistant"}: ${m.content}`)
        .join("\n")
    : "No previous messages.";

  const prompt = PromptTemplate.fromTemplate(`
You are an expert Study Assistant with extensive experience in professionally tutoring students.
You have access to specific course materials, but you also have extensive general knowledge.

Follow these rules when answering a student's question:
1. LANGUAGE - Always respond in the language the student used in their question.
2. PRIMARY SOURCE - Use the provided context to answer the question directly.
3. ENHANCEMENT - If the context is brief, use your own knowledge to provide definitions, examples, or further explanation.
4. DISTINCTION - If you use information NOT found in the documents, clearly state in the student's original language that the provided information is beyond the attached documents.
5. KNOWLEDGE - If the context is missing a definition, use your academic knowledge to explain it clearly.
6. TONE - Be helpful and educational. Do not repeat these instructions in your response.

CONTEXT FROM COURSE MATERIALS:
{context}

CONVERSATION HISTORY:
{history}

STUDENT'S QUESTION:
{question}

YOUR RESPONSE:`);

  const response = await model.invoke(
    await prompt.format({
      context: context.fullContext,
      history: historyText,
      question: originalQuery,
    }),
  );

  return {
    answer: response.content as string,
    sources: context.sources,
  };
}

// Combines per-file summary chunks into a single structured
// overview - needed only when the user wants an overview of all uploaded
// documents (summary intent, but no targetFile).
export async function generateMultiDocSummary(
  summaryDocs: RetrievalResponse,
  query: string,
  model: ChatOpenAI,
): Promise<AiChatResponse> {
  const prompt = PromptTemplate.fromTemplate(
    `You are an expert Study Assistant helping a student understand their course materials.
    You have been given individual summaries for each uploaded document.
    Synthesise them into one clear, well-structured overview.
    Rules:\n\n
    1. Respond in the language the student used in their question.
    2. Give each document its own short section, using the document name as heading.
    3. End with a brief paragraph about the overall themes, connecting recurring ideas across all documents.
    4. Be educational and concise.\n\n
    DOCUMENT SUMMARIES:\n{summaries}\n\n
    STUDENT'S QUESTION: {question}\n\nYOUR RESPONSE:`,
  );

  const response = await model.invoke(
    await prompt.format({ summaries: summaryDocs.fullContext, question: query }),
  );

  return { answer: response.content as string, sources: summaryDocs.sources };
}

// Generates a set of flashcards from retrieved context chunks.
// Each card has a question on the front and answer on the back.
export async function generateFlashcards(
  context: RetrievalResponse,
  count: number,
  model: ChatOpenAI,
): Promise<FlashcardSet> {
  const prompt = PromptTemplate.fromTemplate(
    `You are an expert Study Assistant creating flashcards to help a student memorise key concepts.\n\n
    Rules:\n
    1. Generate exactly {count} flashcards from the provided material.
    2. Each flashcard must test one distinct concept, term, or fact.
    3. Front: a short, clear question or prompt (one sentence max).
    4. Back: a concise but complete answer (1-3 sentences).
    5. Cover a variety of topics from the material — do not repeat the same concept.
    6. Respond in the language used in the study documents.
    7. Respond ONLY with valid JSON — no markdown, no code fences:\n\n
    [{{"front":"...","back":"..."}}, ...]
    \n\nMATERIAL: {context}`,
  );

  const response = await model.invoke(
    await prompt.format({ count, context: context.fullContext }),
  );

  const raw = typeof response.content === "string"
    ? response.content.replace(/```json|```/g, "").trim()
    : "[]";

  const flashcards = JSON.parse(raw) as Flashcard[];
  return { flashcards, sources: context.sources };
}

// Generates a mixed test (multiple-choice + open-answer questions)
// from retrieved context chunks.
export async function generateTest(
  context: RetrievalResponse,
  count: number,
  model: ChatOpenAI,
): Promise<TestSet> {
  // roughly half MCQ, half open, let the model decide exact split
  const prompt = PromptTemplate.fromTemplate(
    `You are an expert Study Assistant creating a test to assess a student's understanding.\n\n
    Rules:
    1. Generate exactly {count} questions from the provided material.
    2. Mix multiple-choice (MCQ) and open-answer questions roughly equally.
    3. For MCQ - provide exactly 4 options labelled A/B/C/D, indicate the correct label, and add a one-sentence explanation.
    4. For open-answer - provide a sample answer the student can compare against.
    5. Questions must cover distinct concepts - no repetition.
    6. Vary difficulty: some factual recall, some application/reasoning.
    7. Respond in the language used in the study documents.
    8. Respond ONLY with valid JSON — no markdown, no code fences — matching this schema exactly:
    \n\n[
      {{"kind":"mcq","question":"...","options":[{{"label":"A","text":"..."}},{{"label":"B","text":"..."}},{{"label":"C","text":"..."}},{{"label":"D","text":"..."}}],"correctLabel":"A","explanation":"..."}},
      {{"kind":"open","question":"...","sampleAnswer":"..."}}
    ]\n\n
    MATERIAL:\n{context}`,
  );

  const response = await model.invoke(
    await prompt.format({ count, context: context.fullContext }),
  );

  const raw = typeof response.content === "string"
    ? response.content.replace(/```json|```/g, "").trim()
    : "[]";

  const questions = JSON.parse(raw) as TestQuestion[];
  return { questions, sources: context.sources };
}

// Evaluates a student's open-answer response against the sample answer.
// Returns a score from 0 to 10, feedback, and a pass/fail flag.
export async function evaluateOpenAnswer(
  question: string,
  sampleAnswer: string,
  studentAnswer: string,
  model: ChatOpenAI,
): Promise<EvaluateResponse> {
  const prompt = PromptTemplate.fromTemplate(
    `You are a fair and constructive academic examiner evaluating a student's answer.\n\n
    Question: {question}\n\n
    Reference answer (not shown to the student): {sampleAnswer}\n\n
    Student's answer: {studentAnswer}\n\n
    Evaluation rules:
    1. Score the answer from 0 to 10 based on correctness, completeness and clarity.
    2. Write 2-4 sentences of constructive feedback: acknowledge what was correct, then explain what was missing or incorrect.
    3. Be encouraging but honest.
    4. Write the response facing the student. Respond in the language used in the student's answer.
    5. Respond ONLY with valid JSON — no markdown, no code fences:
    {{"score": <number 0-10>, "feedback": "<string>"}}`,
  );

  const response = await model.invoke(
    await prompt.format({ question, sampleAnswer, studentAnswer }),
  );

  const raw = typeof response.content === "string"
    ? response.content.replace(/```json|```/g, "").trim()
    : "{\"score\":0,\"feedback\":\"Could not evaluate.\"}";

  const parsed = JSON.parse(raw) as { score: number; feedback: string };
  return {
    score: parsed.score,
    feedback: parsed.feedback,
    isCorrect: parsed.score >= 6,
  };
}
