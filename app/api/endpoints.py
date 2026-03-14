from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    status,
    Query,
)
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.database import get_db
from app.models.models import ChatSession, ChatMessage, KnowledgeChunkData
from app.models.schemas import (
    BaseResponse,
    SessionCreateReq,
    SessionCreateResData,
    ChatMessageReq,
    ChatMessageResData,
    ChatHistoryItem,
    SessionListItem,
)
from app.services.faiss_manager import faiss_manager
from app.services.chunking_service import process_document
from app.services.rag_service import rag_service
import uuid

router = APIRouter()


@router.get("/health/provider", response_model=BaseResponse)
async def check_provider_connectivity():
    """Checks if the LLM and Embedding services are reachable."""
    results = {"chat": "unknown", "embedding": "unknown"}

    # Check Embedding
    try:
        faiss_manager.embeddings.embed_query("connectivity check")
        results["embedding"] = "connected"
    except Exception as e:
        results["embedding"] = f"error: {str(e)}"

    # Check Chat
    try:
        from langchain_core.messages import HumanMessage

        rag_service.llm.invoke([HumanMessage(content="hi")])
        results["chat"] = "connected"
    except Exception as e:
        results["chat"] = f"error: {str(e)}"

    status_code = 200 if all(v == "connected" for v in results.values()) else 500

    return BaseResponse(
        status="success" if status_code == 200 else "error", data=results
    )


@router.post(
    "/sessions", status_code=status.HTTP_201_CREATED, response_model=BaseResponse
)
async def create_session(req: SessionCreateReq, db: Session = Depends(get_db)):
    """Initializes a new support interaction session."""
    db_session = ChatSession(user_id=req.user_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    return BaseResponse(
        status="success",
        data=SessionCreateResData(
            session_id=db_session.id,
            user_id=db_session.user_id,
            created_at=db_session.created_at,
        ),
    )


@router.post("/chat", status_code=status.HTTP_200_OK, response_model=BaseResponse)
async def chat(req: ChatMessageReq, db: Session = Depends(get_db)):
    """Processes a user text against the AI pipeline."""
    db_session = (
        db.query(ChatSession)
        .filter(ChatSession.id == req.session_id, ChatSession.user_id == req.user_id)
        .first()
    )

    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or forbidden user.",
        )

    # Reconstruct history
    db_history = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == req.session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    history = [{"role": msg.role, "content": msg.content} for msg in db_history]

    # Add user message to DB
    user_msg = ChatMessage(session_id=req.session_id, role="user", content=req.message)
    db.add(user_msg)
    db.commit()

    try:
        # Generate Response from RAG Service
        rag_out = rag_service.generate_response(req.message, history)

        reply_content = rag_out.get(
            "answer", "I'm sorry, I'm having an issue generating an answer right now."
        )
        escalate_flag = rag_out.get("escalate", True)
        chunks_used = rag_out.get("chunks", [])
        reason_content = rag_out.get("reason", "")

        # Add assistant reply to DB
        assistant_msg = ChatMessage(
            session_id=req.session_id,
            role="assistant",
            content=reply_content,
            escalate=escalate_flag,
            reason=reason_content,
            chunks_used=",".join(chunks_used),
        )
        db.add(assistant_msg)
        db.commit()

        return BaseResponse(
            status="success",
            data=ChatMessageResData(
                reply=reply_content, escalate=escalate_flag, chunks=chunks_used
            ),
        )
    except Exception as e:
        # Log error with full traceback
        import logging
        import traceback

        logger = logging.getLogger(__name__)
        logger.error(f"Error during RAG generation: {str(e)}")
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate response.",
        )


@router.get("/sessions/{session_id}/history", response_model=BaseResponse)
async def get_chat_history(
    session_id: str, user_id: str, db: Session = Depends(get_db)
):
    """Retrieves chronological chat data for a designated interaction."""
    db_session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .first()
    )

    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )

    return BaseResponse(
        status="success",
        data=[
            ChatHistoryItem(
                role=m.role,
                content=m.content,
                escalate=m.escalate,
                chunks=m.chunks_used.split(",") if m.chunks_used else [],
                reason=m.reason,
            )
            for m in messages
        ],
    )


@router.get("/sessions", response_model=BaseResponse)
async def get_session_list(
    user_id: str, limit: int = 20, offset: int = 0, db: Session = Depends(get_db)
):
    """Returns a list of past & present chat sequences active for a user."""
    total = db.query(ChatSession).filter(ChatSession.user_id == user_id).count()
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return BaseResponse(
        status="success",
        data=[
            SessionListItem(id=s.id, user_id=s.user_id, created_at=s.created_at)
            for s in sessions
        ],
        meta={"limit": limit, "offset": offset, "total": total},
    )


@router.delete("/sessions/{session_id}", response_model=BaseResponse)
async def delete_session(session_id: str, user_id: str, db: Session = Depends(get_db)):
    """Deletes a chat session and its history."""
    db_session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .first()
    )

    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete messages first
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(db_session)
    db.commit()

    return BaseResponse(status="success", data={"deleted": True})


@router.post("/knowledge/preview", response_model=BaseResponse)
async def preview_chunks(
    file: UploadFile = File(...),
    chunk_method: str = Form("static"),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(50),
    regex_pattern: Optional[str] = Form(None),
):
    """Parses a file and returns the chunks without saving them to the vector store."""
    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Only text-based files (TXT, MD) are supported for now.",
        )

    texts, _ = process_document(
        content=content_str,
        document_name=file.filename,
        chunk_method=chunk_method,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        regex_pattern=regex_pattern,
    )

    return BaseResponse(status="success", data={"chunks": texts})


@router.post(
    "/knowledge/documents",
    status_code=status.HTTP_201_CREATED,
    response_model=BaseResponse,
)
async def add_knowledge(
    file: UploadFile = File(...),
    chunk_method: str = Form("static"),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(50),
    regex_pattern: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Ingest and vectorize a new file with configurable chunking strategies."""
    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Only text-based files (TXT, MD) are supported for now.",
        )

    texts, metadatas = process_document(
        content=content_str,
        document_name=file.filename,
        chunk_method=chunk_method,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        regex_pattern=regex_pattern,
    )

    if not texts:
        return BaseResponse(status="success", data={"chunks_processed": 0})

    chunk_ids = faiss_manager.add_texts(texts, metadatas)

    for text, meta, c_id in zip(texts, metadatas, chunk_ids):
        kc = KnowledgeChunkData(id=c_id, document_name=file.filename, content=text)
        db.add(kc)
    db.commit()

    return BaseResponse(status="success", data={"chunks_processed": len(chunk_ids)})


@router.get("/knowledge/chunks/{chunk_id}", response_model=BaseResponse)
async def get_knowledge_chunk(chunk_id: str, db: Session = Depends(get_db)):
    """View singular textual split details."""
    chunk = (
        db.query(KnowledgeChunkData).filter(KnowledgeChunkData.id == chunk_id).first()
    )
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")

    return BaseResponse(
        status="success",
        data={
            "id": chunk.id,
            "document_name": chunk.document_name,
            "content": chunk.content,
            "created_at": chunk.created_at,
        },
    )


@router.get("/knowledge/chunks", response_model=BaseResponse)
async def get_knowledge_chunks_list(
    limit: int = 20, offset: int = 0, db: Session = Depends(get_db)
):
    """Discover indexed references in FAISS/DB."""
    total = db.query(KnowledgeChunkData).count()
    chunks = (
        db.query(KnowledgeChunkData)
        .order_by(KnowledgeChunkData.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return BaseResponse(
        status="success",
        data=[
            {
                "id": c.id,
                "document_name": c.document_name,
                "content": c.content,
                "created_at": c.created_at,
            }
            for c in chunks
        ],
        meta={"limit": limit, "offset": offset, "total": total},
    )


@router.delete("/knowledge/chunks/{chunk_id}", response_model=BaseResponse)
async def delete_knowledge(chunk_id: str, db: Session = Depends(get_db)):
    """Drop an orphaned/archaic reference from vector stores."""
    chunk = (
        db.query(KnowledgeChunkData).filter(KnowledgeChunkData.id == chunk_id).first()
    )
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")

    db.delete(chunk)
    db.commit()

    # Also delete from FAISS
    faiss_manager.delete_chunk(chunk_id)

    return BaseResponse(status="success", data={"deleted": True})
