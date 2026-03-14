import json
import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.core.config import settings
from app.services.faiss_manager import faiss_manager


class LLMResponse(BaseModel):
    """Structured response from the LLM assistant."""

    answer: str = Field(
        description="The concise and helpful answer to the user's question."
    )
    escalate: bool = Field(description="Set to true if a human agent is needed.")
    reason: Optional[str] = Field(
        description="Short reason for escalation, or null if not escalating."
    )
    used_chunk_ids: List[str] = Field(
        description="IDs of retrieved chunks that were actually relevant and used for this answer."
    )


class RAGService:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.0,
        )
        self.system_prompt = self._load_system_prompt()
        self.structured_llm = self.llm.with_structured_output(LLMResponse)

    def _load_system_prompt(self) -> str:
        prompt_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "system_prompt.md",
        )
        if os.path.exists(prompt_path):
            with open(prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        return (
            "You are a helpful assistant. Use retrieved knowledge with IDs to answer."
        )

    def generate_response(
        self, user_message: str, history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Retrieves context, constructs prompt, invokes LLM with structured output.
        """
        # 1. Retrieve context
        search_results = faiss_manager.similarity_search_with_score(user_message, k=5)

        context_texts = []
        for i, (doc, score) in enumerate(search_results):
            chunk_id = doc.metadata.get("chunk_id", f"unknown_{i}")
            context_texts.append(f"[Chunk ID: {chunk_id}]\n{doc.page_content}")

        context_block = (
            "\n\n".join(context_texts)
            if context_texts
            else "No relevant knowledge found."
        )

        # 2. Prepare conversation messages
        messages = [
            SystemMessage(
                content=f"{self.system_prompt}\n\nRETRIEVED KNOWLEDGE SNIPPETS:\n{context_block}"
            )
        ]

        # Add history
        for msg in history[-10:]:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

        # Add current user message
        messages.append(HumanMessage(content=user_message))

        # 3. Predict with Structured Output (with Retry Logic)
        max_retries = 3
        last_error = None

        for attempt in range(max_retries):
            try:
                response: LLMResponse = self.structured_llm.invoke(messages)

                return {
                    "answer": response.answer,
                    "escalate": response.escalate,
                    "reason": response.reason,
                    "chunks": response.used_chunk_ids,
                }
            except Exception as e:
                last_error = e
                import logging

                logging.getLogger(__name__).warning(
                    f"LLM structured output attempt {attempt + 1} failed: {str(e)}"
                )
                continue

        # Fallback if all retries fail
        return {
            "answer": f"I'm sorry, I encountered an internal processing error after several attempts: {str(last_error)}",
            "escalate": True,
            "reason": "internal_llm_error",
            "chunks": [],
        }


rag_service = RAGService()
