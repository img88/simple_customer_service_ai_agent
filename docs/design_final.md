# Customer Service Agent - API and System Design

## 1. Overview
Design document for a RAG-powered Customer Service Agent acting as a Telco Customer Service Assistant. The agent leverages a vector store for factual retrieval, uses LangChain for LLM orchestration, and relies on Google Gemini API for generating responses.

### 1.1 Conversational Endpoint
- **Role**: Telco Customer Service Assistant.
- **Core Function**: Context-aware chat over a continuous session.
- **Responsibility**: Uses predefined system prompts (`system_prompt.md`), acknowledges when answers cannot be formulated, and accurately flags unanswerable queries (`escalate: true`) rather than guessing or hallucinating.

### 1.2 RAG Pipeline
- **Vector DB**: FAISS holds embedded chunks of reference documents.
- **Retrieval**: User messages are matched against the vector store to fetch relevant context.
- **Augmentation**: Context is passed to the context window.
- **Fallback**: If no contextual chunks align with the user query, the agent responds with a standard fallback phrase and sets `escalate: true`.
- **Persistence**: FAISS indexes are saved locally to the `data/` directory, allowing the system to reload existing embeddings without re-embedding the entire knowledge base upon restart.

## 2. Technology Stack & Tooling
- **Framework**: FastAPI (Python)
- **LLM Context & Orchestration**: LangChain
- **LLM Provider**: Google Generative AI (Gemini)
- **Vector Search**: FAISS
- **Database**: SQLite (Conversation History & State Management)
- **Formatting & Linting**: Black, Flake8, isort
- **Testing**: Pytest
- **Typing**: Native Python type hints, strictly enforced.

## 3. Project Structure
To promote separation of concerns, follow a modular architecture:
```text
kata-ai-agent/
├── app/
│   ├── api/            # API routing and endpoints handling
│   ├── core/           # Configuration, security, custom exceptions, logging
│   ├── models/         # SQLAlchemy models and Pydantic schemas
│   ├── services/       # Business logic (RAG pipeline, DB interactions)
│   └── main.py         # Application entry point
├── tests/              # Pytest unit and integration tests
├── data/               # SQLite database file and FAISS index files
├── docs/               # Technical designs (like this file) and architecture diagrams
├── system_prompt.md    # Agent personality and rule definitions
├── .env.example        # Environment variable templates
├── requirements.txt    # requirements definition
└── README.md
```

## 4. API Response Standards & Formats
To ensure a consistent client integration experience, all API endpoints will return a standardized JSON envelope.

### 4.1 Success Response (`2xx`)
```json
{
  "status": "success",
  "data": {
    // Relevant payload data goes here
  },
  "message": "Optional success message snippet.",
  "meta": {
    // Used for list endpoints (pagination details)
    "limit": 10,
    "offset": 0,
    "total": 50
  }
}
```

### 4.2 Error Response (`4xx`, `5xx`)
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary of what went wrong.",
    "details": [
      {
        "field": "user_id",
        "issue": "Field is required."
      }
    ]
  }
}
```

## 5. Error Handling & HTTP Status Codes
All endpoints must use standard HTTP Status Codes representing the precise nature of the event:
- **`200 OK`**: Standard successful request.
- **`201 Created`**: Successful state creation (e.g., a new session initialized).
- **`400 Bad Request`**: Malformed payload or validation failure.
- **`404 Not Found`**: Resource does not exist (e.g., invalid session ID).
- **`422 Unprocessable Entity`**: Automatic FastAPI/Pydantic validation breakdown.
- **`500 Internal Server Error`**: Unexpected failures. API calls to external services (like vector lookups or LLM APIs) MUST be wrapped in robust try-except blocks with fallback protocols and graceful failure messages.

## 6. Endpoints Specification

### 6.1 `POST /api/v1/sessions` (`create_session`)
- **Action**: Initializes a new support interaction.
- **Request Body**:
  ```json
  { "user_id": "string" }
  ```
- **Response**: `201 Created` returning generated `session_id`, `user_id`, and a `created_at` timestamp inside the payload `data` wrapper.

### 6.2 `POST /api/v1/chat` (`chat`)
- **Action**: Processes a user text against the AI pipeline.
- **Request Body**:
  ```json
  {
    "user_id": "string",
    "session_id": "string",
    "message": "string"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "status": "success",
    "data": {
      "reply": "Here is the response based on the latest knowledge base...",
      "escalate": false,
      "chunks": ["chunk_id_1", "chunk_id_2"]
    }
  }
  ```
- **Process logic**: Validates user/session -> Saves incoming message -> Vector retrieval via FAISS -> LangChain context augmented inference -> Sets `escalate` -> Saves AI response -> Returns payload.

### 6.3 `GET /api/v1/sessions/{session_id}/history` (`get_chat_history`)
- **Action**: Retrieves chronological chat data for a designated interaction.
- **Query Parameter**: `user_id`
- **Response**: Paginated standard list of messages with metadata.

### 6.4 `GET /api/v1/sessions` (`get_session_list`)
- **Action**: Returns a list of past & present chat sequences active for a user.
- **Query Parameter**: `user_id`, `limit`, `offset`
- **Response**: List object with encapsulated session metadata.

### 6.5 `GET /api/v1/knowledge/chunks/{chunk_id}` (`get_knowledge_chunk`)
- **Action**: View singular textual split details.

### 6.6 `GET /api/v1/knowledge/chunks` (`get_knowledge_chunks_list`)
- **Action**: Discover indexed references in FAISS.

### 6.7 `POST /api/v1/knowledge/documents` (`add_knowledge`)
- **Action**: Ingest and vectorize a new file with configurable chunking strategies.
- **Request Format**: `multipart/form-data`
  - `file`: TXT/MD stream.
  - `chunk_method`: `"regex"` | `"static"`
  - `chunk_size`: integer
  - `chunk_overlap`: integer
- **Process Logic**: 
  1. File parser extracts raw text.
  2. **Chunking**: Uses LangChain's `RecursiveCharacterTextSplitter`.
  3. `Embedding generator` converts text to vectors (Google Generative AI).
  4. `FAISS` updates index.
  5. Store metadata trace in SQLite.

### 6.8 `DELETE /api/v1/sessions/{session_id}` (`delete_session`)
- **Action**: Deletes a chat session and its history.

## 7. Configuration & Security Best Practices
- **Environment Management**: Hardcoding secrets is strictly prohibited. Configurations like `GEMINI_API_KEY` and `DATABASE_URL` must reside in `.env`.
- **CORS Handling**: Utilize `fastapi.middleware.cors.CORSMiddleware`.
- **Input Validation Sanitization**: Utilize `Pydantic` `Field` constraints.

## 8. Development & Deployment Guidelines (Rule Compliance)
### 8.1 Coding Conventions & Standards
- **Python Version & Environments**: Always use `venv`.
- **Type Hints**: Always use Type Hints.
- **Docstrings**: Always add docstrings (Google format).

## 9. Environment Variables Guide

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Secret key for Google Gemini API. | `AIzaSy...` |
| `EMBEDDING_MODEL`| Model name used for vector embeddings. | `text-embedding-004` |
| `LLM_MODEL`     | Model name for the chat assistant. | `gemini-1.5-flash` |
| `DATABASE_URL`  | Connection string for SQLite. | `sqlite:///./data/database.db` |
| `FAISS_INDEX_PATH`| Directory where FAISS saves its index. | `data/faiss_index` |
| `LOG_LEVEL`      | Logging verbosity. | `INFO` |
| `PORT`           | Port number for Uvicorn server. | `8000` |
