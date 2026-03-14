# Customer Service AI Agent - System Design Document

## 1. Project Overview
**Customer Service AI Agent** is a sophisticated Retrieval-Augmented Generation (RAG) system designed to act as a Virtual Customer Service Assistant for **MyTelco**. The system combines modern web technologies with state-of-the-art Large Language Models (LLMs) to provide accurate, context-aware, and safe responses to telecommunication-related inquiries.

The core objective is to leverage internal knowledge bases (documents) to answer customer questions while maintaining a strict escalation policy if information is unavailable or if the request falls outside the supported scope.

### Key Capabilities:
- **Intelligent RAG**: Fetches relevant knowledge snippets before generating answers.
- **Structured Output**: Ensures AI responses are parsed into valid JSON with metadata (escalation status, reasons, and source tracking).
- **Document Management**: Allows administrators to upload, preview, and index documents using various chunking strategies (Static vs. Regex).
- **Session Persistence**: Maintains complete chat histories and session states in a SQLite database.
- **Provider Connectivity**: Native integration with Google Gemini for both Chat and Embeddings.

---

## 2. Technology Stack & Libraries

### Backend (Python/FastAPI)
- **FastAPI**: High-performance web framework for building APIs.
- **SQLAlchemy**: SQL Toolkit and Object-Relational Mapper (ORM) for session management.
- **LangChain & LangChain-Google-GenAI**: Orchestration framework for LLM chains and native Gemini integration.
- **FAISS (CPU)**: Efficient similarity search library for dense vector retrieval.
- **Pydantic**: Data validation and settings management using Python type hints.
- **Uvicorn**: ASGI server implementation for production-ready deployment.

### Frontend (React/TypeScript)
- **React (Vite)**: Modern UI library and build tool for a fast development experience.
- **Tailwind CSS / Custom CSS**: High-end "Glassmorphism" design with dark/light mode support.
- **Lucide React**: Premium icon set for consistent UI language.
- **Framer Motion**: Advanced animation library for smooth UI transitions and interactions.
- **Axios**: Promised-based HTTP client for API communication.

---

## 3. Project Structure
The project follows a clean, modular architecture to ensure scalability and maintainability.

```text
kata-ai-agent/
├── app/
│   ├── api/            # Route definitions and endpoint logic
│   ├── core/           # App configuration, security, and global exceptions
│   ├── models/         # Database models (SQLAlchemy) and Pydantic schemas
│   ├── services/       # Core business logic (RAG, FAISS, Chunking)
│   └── main.py         # Application entry point and middleware config
├── data/               # Persistent storage (SQLite DB & FAISS indices)
├── docs/               # Technical documentation and system designs
├── frontend/           # React application source code
├── knowledges/         # Raw source documents for the RAG pipeline
├── .env                # Private environment configurations
├── system_prompt.md    # The "brain" - AI instructions and constraints
└── requirements.txt    # Python dependency manifest
```

---

## 4. Environment Variables
The system uses a `.env` file for secure configuration management.

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Secret key for Google Generative AI access. | `AIzaSy...` |
| `EMBEDDING_MODEL`| Google model used for vector generation. | `text-embedding-004` |
| `LLM_MODEL`     | Google model used for the chat assistant. | `gemini-1.5-flash` |
| `DATABASE_URL`  | Connection string for the SQLite database. | `sqlite:///./data/database.db` |
| `FAISS_INDEX_PATH`| Local directory for storing FAISS indices. | `./data/faiss_index` |
| `LOG_LEVEL`      | Granularity of server logs (DEBUG, INFO). | `INFO` |
| `PORT`           | The port number for the Backend server. | `8000` |

---

## 5. API Reference

All responses follow a standard envelope:
```json
{
  "status": "success | error",
  "data": {},
  "message": "Optional info",
  "meta": {}
}
```

### 5.1 Chat & Session Management

#### `POST /api/v1/sessions`
- **Description**: Initializes a new unique support consultation session.
- **Body**: `{ "user_id": "string" }`
- **Usage**: Called when the user starts a "New Consultation".

#### `POST /api/v1/chat`
- **Description**: Processes a user inquiry through the RAG pipeline.
- **Body**: 
  ```json
  {
    "user_id": "string",
    "session_id": "string",
    "message": "string"
  }
  ```
- **Returns**: AI's reply, escalation flag, and IDs of the knowledge chunks used to formulate the answer.

#### `GET /api/v1/sessions/{session_id}/history`
- **Description**: Retrieves all messages within a specific session, including AI metadata (reasons, chunks).
- **Usage**: Used to restore chat history when clicking a past session in the sidebar.

#### `DELETE /api/v1/sessions/{session_id}`
- **Description**: Permanently removes a session and its associated message history.

---

### 5.2 Knowledge Management

#### `POST /api/v1/knowledge/documents`
- **Description**: Ingests, chunks, embeds, and indexes a document.
- **Form Data**:
  - `file`: The document (txt/md).
  - `chunk_method`: `"static"` or `"regex"`.
  - `chunk_size`: Max characters per chunk.
  - `chunk_overlap`: Overlap between adjacent chunks.
  - `regex_pattern`: Custom separator (if method is regex).

#### `POST /api/v1/knowledge/preview`
- **Description**: Similar to ingestion, but only returns the generated chunks for user review without saving them to the database.

#### `GET /api/v1/knowledge/chunks`
- **Description**: Lists all indexed chunks currently in the system.

#### `GET /api/v1/knowledge/chunks/{chunk_id}`
- **Description**: Retrieves full text and document source for a specific chunk.
- **Usage**: Powering the "Source Detail" modal in the frontend.

---

### 5.3 System Health

#### `GET /api/v1/health/provider`
- **Description**: Checks live connectivity to Google Gemini API (Chat & Embedding).
- **Usage**: Debugging and verifying API Key/Model configuration.
