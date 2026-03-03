import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import type { QueryIntent, AiChatResponse, ChatHistoryMessage, RetrievalResponse } from "../types.js";

// Determines user intent - whether user wants a summary or specific detail.
// Also, extracts the target file name (if mentioned) to narrow down retrieval.
export async function getQueryIntent(
  query: string,
  model: ChatOpenAI,
): Promise<QueryIntent> {
  const response = await model.invoke(`
    Analyze this query: "${query}"
    1. Type: Is the user asking for a summary of the whole document/collection, or a specific detail?
       Respond with exactly the word "summary" or "specific".
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
    .map((m) => `${m.role === 0 ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const response = await model.invoke(`
    Given the following conversation history, rewrite the user's latest question as a
    fully self-contained, standalone question that can be understood without any context
    from the conversation. Do NOT answer the question, only rewrite it.
    If the question is already self-contained, return it unchanged.

    Conversation history:
    ${historyText}

    User's latest question: "${latestQuery}"

    Standalone question (return only the question text, no quotes, no explanation):
  `);

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
        .map((m) => `${m.role === 0 ? "Student" : "Assistant"}: ${m.content}`)
        .join("\n")
    : "No previous messages.";

  const prompt = PromptTemplate.fromTemplate(`
You are an expert Study Assistant with extensive experience in professionally tutoring students.
You have access to specific course materials, but you also have extensive general knowledge.

Follow these rules when answering a student's question:
1. LANGUAGE - Always respond in the language the student used in their question.
2. PRIMARY SOURCE - Use the provided context to answer the question directly.
3. ENHANCEMENT - If the context is brief, use your own knowledge to provide definitions, examples, or further explanation.
4. DISTINCTION - If you use information NOT found in the documents, clearly state "Beyond the course materials..." or "In general terms...".
5. KNOWLEDGE - If the context is missing a definition, use your academic knowledge to explain it clearly.
6. TONE - Be helpful and educational. Do not repeat these instructions in your response.
7. CITATION - Always mention the document(s) that contributed to your answer.

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
