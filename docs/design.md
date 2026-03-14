# Customer Service Agent

## Conversational Endpoint
Create a /chat endpoint using FastAPI (Python). It should:
- Accept a user message and conversation history as as input
- Use Google Gemini API
- Apply a system prompt that defines the agent as a Telco Customer Service Assistant
- Return a JSON response with the reply text and an escalate flag (true/false)
- Set escalate: true when the agent cannot answer confidently - don't guess or hallucinate

## RAG Pipeline
Extend the endpoint above to answer using the knowledge base:
- Ingest the 3 sample document into a vector store
- On each user message, retrieve relevant chunks and pass them as context to the LLM
- If no relevant chunks are retrieved, the agent should acknowledge it cannot help and escalate: true

## System Prompt
- see system_prompt.md

## Library used
- LangChain
- LangGraph
- Google Generative AI (Gemini)
- FAISS
- FastAPI
- Use SQLite for conversation history

## Code Standard
- Use type hints
- Use docstrings
- Use flake8 for linting
- Use black for formatting
- Use pytest for testing

# Endpoint Process
- create_session: 
    - input user_id
    - generate session_id
    - store session in database
- chat: 
    - input user_id, session_id, user_message
    - retrieve session from database
    - generate response
    - store response in database
    - return response
- get_chat_history: 
    - input user_id, session_id
    - retrieve session from database
    - return response
- get_session_list: 
    - input user_id
    - retrieve session list from database
    - return response
- get_knowledge_chunks: 
    - input chunk_id
    - retrieve chunk from database
    - return response
- get_knowledge_chunks_list: 
    - retrieve chunk list from database
    - return response
- add_knowledge:
    - input document
    - chunk document
    - store chunk in database
    - return response
- delete_knowledge:
    - input chunk_id
    - delete chunk from database
    - return response

## Create a README.md
- Explain the project structure
- Explain how to run the project
- Explain how to test the project
- Explain how to use the project