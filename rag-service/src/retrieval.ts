import * as dotenv from "dotenv";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { RetrievalResponse } from "../types.js";

dotenv.config();

export async function runRetrieval(
  query: string,
  intent?: any,
): Promise<RetrievalResponse | string> {
  const embeddingModel = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    model: "text-embedding-3-small",
  });

  const vectorStore = new Chroma(embeddingModel, {
    collectionName: "my_document_collection",
    url: "http://localhost:8000",
    collectionMetadata: { "hnsw:space": "cosine" },
  });

  // building a filter dynamically based on intent
  const filterList: any[] = [];

  filterList.push({ isSummary: { $eq: intent.type === "summary" } });

  // add the name filter if a target file exists
  console.log(intent)
  if (intent.targetFile && intent.targetFile !== "null") {
    filterList.push({ shortName: { $eq: intent.targetFile.toLowerCase() } });
  }

  const filter = filterList.length > 1 ? { $and: filterList } : filterList[0];

console.log("Full Chroma Filter:", JSON.stringify(filter, null, 2));
  // passing the filter to the retriever
  const retriever = vectorStore.asRetriever({
    k: 20,
    searchType: "similarity",
    filter: filter,
  });

  const relevant_docs = await retriever.invoke(query);

  if (relevant_docs.length === 0) {
    return "No relevant documents found.";
  }

  const sources = relevant_docs.map((doc) => ({
    fileName: doc.metadata.source,
    shortName: doc.metadata.shortName,
    page: doc.metadata.pageNumber,
    isSummary: doc.metadata.isSummary,
    snippet: doc.pageContent.substring(0, 200) + "...", // preview for showing in UI
  }));

  console.log(sources)

  return {
    fullContext: relevant_docs.map((d) => d.pageContent).join("\n\n"),
    sources: sources,
  };
}
