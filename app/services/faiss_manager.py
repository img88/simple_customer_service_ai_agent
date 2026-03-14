import os
import traceback
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
from typing import List, Dict, Any, Optional

import logging

logger = logging.getLogger(__name__)


class FAISSManager:
    def __init__(self):
        self.index_path = settings.FAISS_INDEX_PATH
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
        )
        self.vector_store: Optional[FAISS] = None
        self._load_or_create_index()

    def _load_or_create_index(self):
        """
        Loads the FAISS index if it exists; otherwise creates an empty one.
        """
        if os.path.exists(self.index_path) and os.listdir(self.index_path):
            try:
                self.vector_store = FAISS.load_local(
                    self.index_path,
                    self.embeddings,
                    allow_dangerous_deserialization=True,
                )
                logger.info(f"Loaded FAISS index from {self.index_path}")
            except Exception as e:
                logger.error(f"Failed to load FAISS index: {e}")
                self._initialize_empty()
        else:
            self._initialize_empty()

    def _initialize_empty(self):
        """
        Initializes an empty FAISS index (needs at least one dummy document or directly instantiated from texts).
        We will just leave it None and instantiate on first add.
        """
        self.vector_store = None
        logger.info("Initialized with empty FAISS vector store.")

    def add_texts(self, texts: List[str], metadatas: List[dict]):
        """
        Adds texts to the FAISS index and persists it.
        """
        logger.info(f"Adding {len(texts)} chunks to FAISS index.")
        try:
            if self.vector_store is None:
                logger.info("Creating new FAISS vector store from texts...")
                self.vector_store = FAISS.from_texts(
                    texts, self.embeddings, metadatas=metadatas
                )
            else:
                logger.info("Adding texts to existing FAISS vector store...")
                self.vector_store.add_texts(texts, metadatas=metadatas)

            logger.info("Saving FAISS index locally...")
            self.save_index()
            return [meta.get("chunk_id") for meta in metadatas]
        except Exception as e:
            logger.error(f"Error in add_texts: {str(e)}")
            logger.error(traceback.format_exc())
            raise e

    def save_index(self):
        """
        Persists the current FAISS index to the local file system.
        """
        if self.vector_store:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
            self.vector_store.save_local(self.index_path)
            logger.info(f"FAISS index saved to {self.index_path}")

    def similarity_search_with_score(self, query: str, k: int = 4):
        """
        Searches the index for the query.
        """
        if self.vector_store is None:
            return []
        # Lower score is better in FAISS L2 distance
        return self.vector_store.similarity_search_with_score(query, k=k)

    def delete_chunk(self, chunk_id: str):
        """
        Deletes a chunk from the index.
        Note: FAISS delete is somewhat limited unless using specific mapping.
        Langchain FAISS wrapper supports delete with doc ids if we stored them.
        """
        if self.vector_store is None:
            return False

        docstore = self.vector_store.docstore._dict
        doc_id_to_delete = None
        # O(N) search to find the doc_id that has this chunk_id
        for doc_id, doc in docstore.items():
            if doc.metadata.get("chunk_id") == chunk_id:
                doc_id_to_delete = doc_id
                break

        if doc_id_to_delete:
            self.vector_store.delete([doc_id_to_delete])
            self.save_index()
            return True
        return False

    def get_all_chunks(self, limit: int = 10, offset: int = 0):
        """
        Retrieves chunks metadata for listing purposes.
        """
        if self.vector_store is None:
            return []

        docstore = self.vector_store.docstore._dict
        all_docs = list(docstore.values())
        paginated_docs = all_docs[offset : offset + limit]

        return [
            {
                "chunk_id": doc.metadata.get("chunk_id"),
                "document_name": doc.metadata.get("document_name"),
                "content": doc.page_content,
            }
            for doc in paginated_docs
        ]


faiss_manager = FAISSManager()
