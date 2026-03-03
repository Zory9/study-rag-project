import { Chroma } from "@langchain/community/vectorstores/chroma";
import type { QueryIntent, Citation, RetrievalResponse } from "../types.js";

// Retrieves relevant chunks from Chroma scoped to a specific chat session.
export async function runRetrieval(
  query: string,
  sessionId: number,
  intent: QueryIntent,
  vectorStore: Chroma,
): Promise<RetrievalResponse | string> {
  // Building a chroma $and filter to
  // always scope to sessionId,
  // always match isSummary to intent type,
  // optionally narrow to a fileName within the session
  const filterClauses: any[] = [
    { sessionId: { $eq: sessionId } },
    { isSummary: { $eq: intent.type === "summary" } },
  ];

  if (intent.targetFile && intent.targetFile !== "null") {
    filterClauses.push({ fileName: { $eq: intent.targetFile } });
  }

  const filter = filterClauses.length === 1 ? filterClauses[0] : { $and: filterClauses };

  console.log("Chroma filter:", JSON.stringify(filter, null, 2));

  const retriever = vectorStore.asRetriever({
    k: 20,
    searchType: "similarity",
    filter,
  });

  const relevantDocs = await retriever.invoke(query);

  if (relevantDocs.length === 0) {
    return "No relevant documents found.";
  }

  const sources: Citation[] = relevantDocs.map((doc) => ({
    fileName: doc.metadata.fileName as string,
    page: (doc.metadata.pageNumber as number) ?? null,
    lineFrom: (doc.metadata.lineFrom as number | undefined) ?? null,
    lineTo: (doc.metadata.lineTo as number | undefined) ?? null,
    snippet: doc.pageContent.substring(0, 200) + "…",
  }));

  return {
    fullContext: relevantDocs.map((d) => d.pageContent).join("\n\n"),
    sources,
  };
}
