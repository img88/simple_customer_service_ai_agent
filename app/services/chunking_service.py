import uuid
from typing import List, Tuple, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter


def process_document(
    content: str,
    document_name: str,
    chunk_method: str = "static",
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    regex_pattern: Optional[str] = None,
) -> Tuple[List[str], List[dict]]:
    """
    Splits the content and returns lists of strings along with their metadatas.
    """
    is_regex = False
    if chunk_method == "regex":
        if regex_pattern:
            separators = [regex_pattern]
            is_regex = True
        else:
            separators = ["\n\n", "\n", ".", "?", "!", " ", ""]
    else:
        separators = [" ", ""]  # Static character level but try not to cut words

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=separators,
        is_separator_regex=is_regex,
    )

    chunks = splitter.create_documents([content])

    texts = [chunk.page_content for chunk in chunks]
    metadatas = []
    for c in chunks:
        chunk_id = str(uuid.uuid4())
        metadatas.append(
            {
                "chunk_id": chunk_id,
                "document_name": document_name,
            }
        )
    return texts, metadatas
