# Study Buddy RAG Application

A full-stack Retrieval-Augmented Generation (RAG) study tool featuring an Angular frontend, a .NET 9 backend, and a LangChain-powered document analysis service backed by ChromaDB.

## Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Angular 20, Kendo UI for Angular    |
| Backend     | .NET 9 / ASP.NET Core Web API       |
| RAG service | Node.js 22, LangChain, OpenAI       |
| Vector DB   | ChromaDB (Docker)                   |
| Database    | SQL Server 2022                     |
| Auth        | JWT                                 |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [OpenAI API key](https://platform.openai.com/api-keys)
- *(For manual run only)* .NET 9 SDK, Node.js 22, Angular CLI

## Quick start with Docker

### 1. Configure secrets

Create `rag-service/.env`:

```
OPENAI_API_KEY=sk-...
CHROMA_URL=http://chroma:8000
```

Update the SQL Server connection string and JWT key in `backend/RagProject.API/appsettings.json`.

### 2. Build and start

```bash
docker compose up --build
```

Docker builds each service from its own `Dockerfile` and starts them in order:

1. **ChromaDB** (`localhost:8000`)&mdash;waits for its own healthcheck before anything else starts
2. **RAG service** (`localhost:3100`)&mdash;built from `rag-service/Dockerfile`
3. **Backend** (`localhost:5153`)&mdash;built from `backend/Dockerfile`
4. **Frontend** (`localhost:4200`)&mdash;built from `frontend/Dockerfile`, served by nginx

Open **http://localhost:4200** once all containers are running.

Subsequent starts (no code changes):

```bash
docker compose up
```

Stop everything:

```bash
docker compose down
```

## Manual start (development)

Use this for hot-reload and debugging access.

### 1. Start ChromaDB only

```bash
docker compose up chroma -d
```

### 2. Start the RAG service

```bash
cd rag-service
npm ci
npm run dev
```

### 3. Start the backend

```bash
cd backend/RagProject.API
dotnet run
```
Swagger UI available at **http://localhost:5153/swagger**

### 4. Start the frontend

```bash
cd frontend
npm ci
ng serve
```

Application available at **http://localhost:4200/**