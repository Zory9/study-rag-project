// This CLI entry point is kept only for ad-hoc retrieval testing.
import "dotenv/config";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { runRetrieval } from "./src/retrieval.js";

const query = process.argv.slice(2).join(" ");

if (!query) {
  console.error("Usage: tsx main.ts <query>");
  process.exit(1);
}

const vectorStore = new Chroma(
  new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY, model: "text-embedding-3-small" }),
  {
    collectionName: "my_document_collection",
    url: process.env.CHROMA_URL ?? "http://localhost:8000",
    collectionMetadata: { "hnsw:space": "cosine" },
  },
);

console.log(`Querying (no session filter — for testing only): "${query}"`);
// sessionId 0 won't match any real session; a real one is needed for meaningful results
const result = await runRetrieval(query, 0, { type: "specific" }, vectorStore);
console.log(result);