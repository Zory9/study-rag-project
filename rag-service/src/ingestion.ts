import * as dotenv from "dotenv";
import { DirectoryLoader } from "@langchain/classic/document_loaders/fs/directory";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import type { SanitizedDocument } from "../types.js";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";

dotenv.config();

async function loadDocuments(): Promise<any> {
  const loader = new DirectoryLoader("./documents", {
    ".txt": (path) => new TextLoader(path),
    ".pdf": (path) => new PDFLoader(path),
  });

  const documents = await loader.load();
  return documents;
}

async function splitDocuments(
  documents: any,
  chunkSize = 800,
  chunkOverlap = 50,
): Promise<any[]> {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: chunkOverlap,
  });
  const chunks = await textSplitter.splitDocuments(documents);
  return chunks;
}

function sanitizeChunks(chunks: any[]): SanitizedDocument[] {
  const sanitizedChunks = chunks.map((chunk: any) => {
    // extract relevant metadata fields and flatten them into top-level metadata
    const fileName = chunk.metadata.source
      ? chunk.metadata.source.split(/[\\/]/).pop()
      : "Unknown";

    const extractedMetadata = {
      source: chunk.metadata.source,
      shortName: chunk.metadata.shortName?.toLowerCase() || fileName.toLowerCase(),
      isSummary: chunk.metadata.isSummary || false,
      totalPages: chunk.metadata.pdf?.totalPages,
      pageNumber: chunk.metadata.loc?.pageNumber || chunk.metadata.page || 1,
      lineFrom: chunk.metadata.loc?.lines?.from,
      lineTo: chunk.metadata.loc?.lines?.to,
      title: chunk.metadata.pdf?.info?.Title,
    };

    const combined = { ...chunk.metadata, ...extractedMetadata };

    // sanitize and keep only string, number, boolean values; and remove null/undefined (prevents Chroma errors)
    return {
      ...chunk,
      metadata: Object.fromEntries(
        Object.entries(combined).filter(
          ([_, value]) =>
            (typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean") &&
            value !== null &&
            value !== undefined,
        ),
      ),
    };
  });

  return sanitizedChunks;
}

async function createVectorStore(chunks: any[]): Promise<Chroma> {
  const embeddingModel = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    model: "text-embedding-3-small",
  });

  const vectorStore = await Chroma.fromDocuments(
    chunks,
    embeddingModel,
    {
      collectionName: "my_document_collection",
      url: "http://localhost:8000",
      collectionMetadata: {
        "hnsw:space": "cosine",
      },
    },
  );
  return vectorStore;
}

export async function ingestFiles() {
  const allDocs = await loadDocuments();

  // group documents by their source file path
  const docsBySource = allDocs.reduce((acc: any, doc: any) => {
    const source = doc.metadata.source;
    if (!acc[source]) acc[source] = [];
    acc[source].push(doc);
    return acc;
  }, {});

  const model = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 });
  const allSummaryDocs = [];
  const allChunks: any[] = [];

  // process each file individually
  for (const source in docsBySource) {
    const fileDocs = docsBySource[source];
    const fullText = fileDocs.map((d: any) => d.pageContent).join("\n");

    console.log(`Generating summary for: ${source}`);

    // generate summary for this specific file
    const summaryResponse = await model.invoke(
      `Summarize this document in 3-5 key paragraphs for a student. 
       Answer in the language of the document: ${fullText}`,
    );

    allSummaryDocs.push({
      pageContent: summaryResponse.content,
      metadata: {
        source: source,
        shortName: source.split(/[\\/]/).pop()?.toLowerCase() || "unknown",
        isSummary: true,
        pageNumber: 0,
        title: `Summary of ${source.split(/[\\/]/).pop()}`,
      },
    });

    // create normal chunks for this specific file
    const fileChunks = await splitDocuments(fileDocs);
    allChunks.push(...fileChunks);
  }

  const sanitizedChunks = sanitizeChunks(allChunks);
  // create vector store with both summaries and chunks
  const finalDocsToUpload = [...allSummaryDocs, ...sanitizedChunks];

  console.log(finalDocsToUpload.map((d) => d.metadata).filter((m) => m.isSummary)); // Log metadata of sanitized docs for debugging

  await createVectorStore(finalDocsToUpload);
  console.log("Ingestion complete!");
}

// uncomment later for testing individual file ingestion
// async function createVectorStoreFinal(summary: any, chunks: any[]): Promise<Chroma> {
//   const embeddingModel = new OpenAIEmbeddings({
//     apiKey: process.env.OPENAI_API_KEY,
//     model: "text-embedding-3-small",
//   });

//   const vectorStore = new Chroma(embeddingModel, {
//     collectionName: "my_document_collection",
//     url: "http://localhost:8000",
//     collectionMetadata: {
//       "hnsw:space": "cosine",
//     },
//   });

//   await vectorStore.addDocuments([summary, ...chunks])

//   return vectorStore;
// }

// async function getDocumentsFromFile(filePath: string) {
//   const extension = filePath.split('.').pop()?.toLowerCase();

//   let loader;
//   switch (extension) {
//     case "pdf":
//       loader = new PDFLoader(filePath);
//       break;
//     case "txt":
//       loader = new TextLoader(filePath);
//       break;
//     case "docx":
//       loader = new DocxLoader(filePath);
//       break;
//     default:
//       throw new Error(`Unsupported file type: ${extension}`);
//   }

//   return await loader.load();
// }

// export async function processSingleFile(filePath: string) {
//   const fileDocs = await getDocumentsFromFile(filePath);

//   const fullText = fileDocs.map((d) => d.pageContent).join("\n");
//   const model = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 });
//   const summaryResponse = await model.invoke(`Summarize this document: ${fullText}`);

//   const summaryDoc = {
//     pageContent: summaryResponse.content,
//     metadata: {
//       source: filePath,
//       isSummary: true,
//       shortName: filePath.split(/[\\/]/).pop()
//     }
//   };

//   const chunks = await splitDocuments(fileDocs);
//   const sanitizedChunks = sanitizeChunks(chunks);

//   await createVectorStoreFinal(summaryDoc, sanitizedChunks);
// }
