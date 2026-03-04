import type { DocumentInterface } from "@langchain/core/documents";
import type { QueryIntent, Citation, RetrievalResponse } from "../types.js";
import type { Chroma } from "@langchain/community/vectorstores/chroma";

// Client-side MMR implementation needed because langchain
// chroma wrapper seems to not support mmr in typescript.
function applyMMR(
  docs: DocumentInterface[],
  scores: number[],
  k: number,
  lambda: number,
): DocumentInterface[] {
  if (docs.length <= k) return docs;

  const selected: number[] = [];
  const remaining = docs.map((doc, i) => ({ doc, score: scores[i] ?? 0, i }));

  while (selected.length < k && remaining.length > 0) {
    let bestPos = 0;
    let bestMMR = -Infinity;

    for (let ci = 0; ci < remaining.length; ci++) {
      const relevance = remaining[ci]!.score;

      let maxRedundancy = 0;
      for (const si of selected) {
        const selWords = new Set(docs[si]!.pageContent.toLowerCase().split(/\s+/));
        const candWords = remaining[ci]!.doc.pageContent.toLowerCase().split(/\s+/);
        const intersection = candWords.filter((w) => selWords.has(w)).length;
        const union = selWords.size + candWords.length - intersection;
        const jaccard = union > 0 ? intersection / union : 0;
        if (jaccard > maxRedundancy) maxRedundancy = jaccard;
      }

      const mmr = lambda * relevance - (1 - lambda) * maxRedundancy;
      if (mmr > bestMMR) { bestMMR = mmr; bestPos = ci; }
    }

    selected.push(remaining[bestPos]!.i);
    remaining.splice(bestPos, 1);
  }

  return selected.map((i) => docs[i]!);
}

// Retrieves relevant chunks from Chroma scoped to a specific chat session.
export async function runRetrieval(
  query: string,
  sessionId: number,
  intent: QueryIntent,
  vectorStore: Chroma,
): Promise<RetrievalResponse | string> {
  const isSummaryQuery = intent.type === "summary";
  // Building a chroma $and filter to
  // always scope to sessionId,
  // always match isSummary to intent type,
  // optionally narrow to a fileName within the session
  const filterClauses: any[] = [
    { sessionId: { $eq: sessionId } },
    { isSummary: { $eq: isSummaryQuery } },
  ];

  if (intent.targetFile && intent.targetFile !== "null") {
    filterClauses.push({ fileName: { $eq: intent.targetFile } });
  }

  const filter = filterClauses.length === 1 ? filterClauses[0] : { $and: filterClauses };

  console.log("Chroma filter:", JSON.stringify(filter, null, 2));

  // Summary queries hit a small pool, so we can use plain similarity.
  // For specific queries, fetch 40 candidates with similarity scores then apply MMR
  let relevantDocs: DocumentInterface[];
  if (isSummaryQuery) {
    relevantDocs = await vectorStore.similaritySearch(query, 10, filter);
  } else {
    const candidatesWithScores = await vectorStore.similaritySearchWithScore(query, 40, filter);
    const docs = candidatesWithScores.map(([doc]) => doc);
    const scores = candidatesWithScores.map(([, score]) => score);
    console.log(scores)
    relevantDocs = applyMMR(docs, scores, 8, 0.6);
  }

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

  const fullContext = relevantDocs
    .map((d) => {
      const label = d.metadata.fileName
        ? `[Document: ${d.metadata.fileName}]`
        : "[Document]"
      return `${label}\n${d.pageContent}`;
    })
    .join("\n\n---\n\n");

  return { fullContext, sources };
}
