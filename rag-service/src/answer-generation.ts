import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { runRetrieval } from "./retrieval.js";
import type { RetrievalResponse } from "../types.js";

async function getQueryIntent(
  query: string,
): Promise<{ type: "summary" | "specific"; targetFile?: string }> {
  const model = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 });

  const response = await model.invoke(`
    Analyze this query: "${query}"
    1. Type: Is the user asking for a summary of the whole document/collection, or a specific detail? Respond with the word "summary" or "specific".
    2. Target: If the user mentions a specific file or topic, extract the keyword.
    
    Respond in JSON: { "type": "summary" | "specific", "targetFile": "keyword or null" }
  `);

  const content =
    typeof response.content === "string"
      ? response.content.replace(/```json|```/g, "").trim()
      : response.content;
  return JSON.parse(content as string);
}

export async function runChat(query: string, chatHistory: string[]) {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.3, // lower temperature for more factual answers
  });

  const intent = await getQueryIntent(query);
  const context = (await runRetrieval(query, intent)) as RetrievalResponse;

  // system prompt
  const prompt = PromptTemplate.fromTemplate(`
  You are an expert Study Assistant with an extensive experience in professionally tutoring students. 
  You have access to specific course materials, but you also have extensive general knowledge.

  Follow these rules when answering a user's question:
  1. LANGUAGE - Always respond in the language used by the user.
  2. PRIMARY SOURCE - Use the provided context to answer the question directly. 
  3. ENHANCEMENT - If the context is brief, use your own knowledge to provide definitions, examples, or further explanation to help the student learn.
  4. DISTINCTION - If you use information NOT found in the documents, clearly state something like "Beyond the course materials..." or "In general terms..."
  5. KNOWLEDGE - Use the provided context as your foundation. If the context is missing a definition, use your academic knowledge to explain it clearly so the user can understand the course material.
  6. TONE - Be helpful and educational. Do not repeat the current rules or headings in your response.
  7. CITATION - Always cite the provided documents if they contributed to your answer.

  CONTEXT FROM COURSE MATERIALS:
  {context}

  CHAT HISTORY:
  {history}

  STUDENT QUESTION: 
  {question}

  YOUR RESPONSE:`);

  const chainInput = {
    context: context.fullContext,
    history: chatHistory.join("\n"),
    question: query,
  };

  console.log(context); // Log first 200 characters of context for debugging
  const response = await model.invoke(await prompt.format(chainInput));

  return {
    answer: response.content,
    sources: context.sources,
  };
}
