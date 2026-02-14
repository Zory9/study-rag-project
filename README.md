# Study Buddy RAG application

A full-stack Retrieval-Augmented Generation (RAG) system featuring an Angular frontend, a .NET Core backend, and a LangChain-powered document analysis service.

## Set up

### 1. Prerequisites
- Docker Desktop
- OpenAI API Key

### 2. Starting the vector database

From the root folder, run:

```bash
docker compose up -d
```

This will start ChromaDB and link its storage to your project's local db/ folder.

### 3. Running the RAG Pipeline

Navigate to the `rag-service` folder and run the following commands:

```bash
cd rag-service
npm install
npm run ingest
npm run query -- "Your question here"
```