import { ingestFiles } from "./src/ingestion.js";
import { runRetrieval } from "./src/retrieval.js";

const mode = process.argv[2];
const query = process.argv.slice(3).join(" "); 

async function main() {
  if (mode === "ingest") {
    console.log("Starting Ingestion...");
   
    await ingestFiles();
    console.log("Ingestion Complete!");
  } 
  else if (mode === "query") {
    if (!query) {
      console.error("Please provide a query. Example: npm run query 'What is RAG?'");
      return;
    }
    console.log(`Searching for: "${query}"...`);
    const result = await runRetrieval(query);
    console.log("\n--- Top Result ---");
    console.log(result);
  }
}

main().catch(console.error);