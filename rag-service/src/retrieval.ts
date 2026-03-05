import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import type { DocumentInterface } from "@langchain/core/documents";
import type { QueryIntent, Citation, RetrievalResponse } from "../types.js";
import type { Chroma } from "@langchain/community/vectorstores/chroma";
import { applyMMR, reciprocalRankFusion } from "./utils.js";

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

  const filter =
    filterClauses.length === 1 ? filterClauses[0] : { $and: filterClauses };

  console.log("Chroma filter:", JSON.stringify(filter, null, 2));

  let relevantDocs: DocumentInterface[];

  if (isSummaryQuery) {
    // Summary pool is small (one chunk per file), so plain similarity is enough.
    relevantDocs = await vectorStore.similaritySearch(query, 10, filter);
  } else {
    // Fetch all chunks for this session from chroma to run BM25
    // on them alongside semantic search
    const collection = await (vectorStore as any).ensureCollection();
    // Also, obtain embeddings from the collection to pass them to MMR later to apply cosine similarity
    const allDocsResult = await collection.get({
      include: ["embeddings"],
      where: filter,
    });
    const allEmbeddings: number[][] = allDocsResult.embeddings ?? [];
    const allDocs: DocumentInterface[] = (
      allDocsResult.documents as string[]
    ).map((content: string, i: number) => ({
      pageContent: content,
      metadata: allDocsResult.metadatas[i] ?? {},
    }));

    // Embed the query to pass to MMR for similarity scoring
    const queryEmbedding = await (vectorStore as any).embeddings.embedQuery(
      query,
    );

    // Run vector search and BM25 (keyword-based search) in parallel.
    const [similarityResults, bm25Results] = await Promise.all([
      vectorStore.similaritySearchWithScore(query, 40, filter),
      BM25Retriever.fromDocuments(allDocs, { k: 40 }).invoke(query),
    ]);

    const similarityDocs = similarityResults.map(([doc]) => doc);

    // Merge both result sets into one pool keyed by pageContent and remove duplicates.
    const poolMap = new Map<
      string,
      { doc: DocumentInterface; embedding?: number[] }
    >();
    for (const doc of [...similarityDocs, ...bm25Results]) {
      if (!poolMap.has(doc.pageContent)) {
        const embIdx = allDocs.findIndex(
          (d) => d.pageContent === doc.pageContent,
        );
        const embedding = allEmbeddings[embIdx];
        poolMap.set(
          doc.pageContent,
          embedding !== undefined ? { doc, embedding } : { doc },
        );
      }
    }
    const poolEntries = [...poolMap.values()];
    const pool = poolEntries.map((e) => e.doc);
    const poolEmbeddings = poolEntries
      .map((e) => e.embedding)
      .filter((e): e is number[] => !!e);
    const embeddingsAvailable = poolEmbeddings.length === pool.length;
    const poolIndex = new Map(pool.map((doc, i) => [doc.pageContent, i]));

    // Build rank maps using the position in each result as the rank (0 = best).
    const semanticRanks = new Map(
      similarityDocs.map((doc, rank) => [poolIndex.get(doc.pageContent)!, rank]),
    );
    const bm25Ranks = new Map(
      bm25Results.map((doc, rank) => [poolIndex.get(doc.pageContent)!, rank]),
    );

    // Fuse both ranked lists with RRF, sort by fused score, apply MMR for final result.
    const fusedScores = reciprocalRankFusion(semanticRanks, bm25Ranks);
    const fusedOrder = [...fusedScores.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);

    const rerankedDocs = fusedOrder.map((i) => pool[i]!);
    const rerankedScores = fusedOrder.map((i) => fusedScores.get(i)!);

    relevantDocs = applyMMR(
      rerankedDocs,
      rerankedScores,
      8,
      0.6,
      embeddingsAvailable ? poolEmbeddings : undefined,
      embeddingsAvailable ? queryEmbedding : undefined,
    );
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
        : "[Document]";
      return `${label}\n${d.pageContent}`;
    })
    .join("\n\n---\n\n");

  return { fullContext, sources };
}
