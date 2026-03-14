# Customer Service AI Agent - Telco Customer Service Assistant

A RAG-powered Customer Service Agent acting as a Telco Assistant. This project leverages FastAPI, FAISS, LangChain, and Google Gemini models to answer user queries safely and correctly.

## Project Structure
```text
kata-ai-agent/
├── app/
│   ├── api/            # API endpoints
│   ├── core/           # Configuration, exceptions handler
│   ├── models/         # SQLAlchemy and Pydantic schemas
│   ├── services/       # RAG, FAISS, and Chunking business logic
│   └── main.py         # Application entry point
├── data/               # SQLite and FAISS storage
├── docs/               # Technical designs
├── system_prompt.md    # Agent personality and rule definitions
├── .env.example        # Environment variable templates
├── requirements.txt    # requirements definition
└── README.md
```

## Environment Setup

### 1. Backend (FastAPI)
- Create a virtual environment and install dependencies:
  ```bash
  python -m venv .venv
  source .venv/bin/activate  # MacOS/Linux
  .venv\Scripts\activate     # Windows
  pip install -r requirements.txt
  ```
- Configure your environment variables:
  ```bash
  cp .env.example .env
  # Update .env with your GEMINI_API_KEY
  ```

### 2. Frontend (React)
- Navigate to the frontend directory and install packages:
  ```bash
  cd frontend
  npm install
  ```

---

## How to Run Dev

### 1. Start the Backend Server
From the root directory, run:
```bash
./.venv/Scripts/uvicorn app.main:app --reload
```
The API will be available at `http://127.0.0.1:8000` with interactive docs at `/docs`.

### 2. Start the Frontend Development Server
From the `frontend` directory, run:
```bash
npm run dev
```
The application will typically be available at `http://localhost:5173`.

## How to Use (Frontend)
1. Upload knowledge base (icon DB)
  - upload knowledge in knowledges folder
  - because documents provided are small, chunk method static, chunk size 500 and overlap 50 is enough to make sure all information in a document is included in one chunk.
  - you can see preview chunk to verify the chunking result.
  - then save and index document.
2. Create session (icon Chat)
  - click new consultation 
3. Chat with assistant

