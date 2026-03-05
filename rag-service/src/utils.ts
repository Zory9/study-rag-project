import type { DocumentInterface } from "@langchain/core/documents";

// Tokenises text into lowercase words, stripping punctuation;
// used by both RRF and MMR.
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

// Reciprocal Rank Fusion
// merges two ranked lists into a single score
// k=60 is the standard constant that suppresses the effect of very high ranks
export function reciprocalRankFusion(
  similarityRanks: Map<number, number>,
  bm25Ranks: Map<number, number>,
  k = 60,
): Map<number, number> {
  const fused = new Map<number, number>();
  for (const [id, rank] of similarityRanks) {
    fused.set(id, (fused.get(id) ?? 0) + 1 / (k + rank));
  }
  for (const [id, rank] of bm25Ranks) {
    fused.set(id, (fused.get(id) ?? 0) + 1 / (k + rank));
  }

  return fused;
}

// Dot product of two vectors
function dot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
}

// Cosine similarity between two embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  const denom = Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b));
  return denom === 0 ? 0 : dot(a, b) / denom;
}

// MMR implementation 
// it re-ranks the documents to balance relevance and diversity
// (lambda=1 - pure relevance; lambda=0 - pure diversity)
// (for the record, this function mirrors langchain's maximalMarginalRelevance implementation
// here because seems that chroma's vector store does not expose it in typescript)
//
// Relevance (similarity to query) is calculated using cosine similarity when embeddings are
// available and falls back to the RRF-fused score when there are no embeddings.
// Redundancy (similarity to selected) uses cosine similarity 
// between selected and candidate embeddings
// and has a Jaccard fallback when embeddings are unavailable.
export function applyMMR(
  docs: DocumentInterface[],
  rrfScores: number[],
  k: number,
  lambda: number,
  embeddings?: number[][],
  queryEmbedding?: number[],
): DocumentInterface[] {
  if (docs.length <= k) return docs;

  // pre-compute similarity for every candidate once
  const similarityToQuery = docs.map((_, i) =>
    embeddings && queryEmbedding
      ? cosineSimilarity(queryEmbedding, embeddings[i]!)
      : (rrfScores[i] ?? 0),
  );

  const selected: number[] = [];
  const remaining = docs.map((_, i) => i);

  // pick the most relevant document first
  let mostSimilarEmbeddingIndex = remaining[0]!;
  for (const i of remaining) {
    if (similarityToQuery[i]! > similarityToQuery[mostSimilarEmbeddingIndex]!) {
      mostSimilarEmbeddingIndex = i;
    }
  }
  selected.push(mostSimilarEmbeddingIndex);
  remaining.splice(remaining.indexOf(mostSimilarEmbeddingIndex), 1);

  while (selected.length < k && remaining.length > 0) {
    let bestPos = 0;
    let bestMMR = -Infinity;

    for (let ci = 0; ci < remaining.length; ci++) {
      const candIdx = remaining[ci]!;
      const similarityScore = similarityToQuery[candIdx]!;

      // max cosine similarity between current candidate and any already-selected doc
      let maxSimilarityToSelected = 0;
      for (const sel of selected) {
        const similarityToSelected = embeddings
          ? cosineSimilarity(embeddings[candIdx]!, embeddings[sel]!)
          : (() => {
              const selWords = new Set(tokenise(docs[sel]!.pageContent));
              const candWords = tokenise(docs[candIdx]!.pageContent);
              const intersection = candWords.filter((w) =>
                selWords.has(w),
              ).length;
              const union = selWords.size + candWords.length - intersection;
              return union > 0 ? intersection / union : 0;
            })();

        if (similarityToSelected > maxSimilarityToSelected) {
          maxSimilarityToSelected = similarityToSelected;
        }
      }

      const mmr = lambda * similarityScore - (1 - lambda) * maxSimilarityToSelected;
      if (mmr > bestMMR) {
        bestMMR = mmr;
        bestPos = ci;
      }
    }

    selected.push(remaining[bestPos]!);
    remaining.splice(bestPos, 1);
  }

  return selected.map((i) => docs[i]!);
}
