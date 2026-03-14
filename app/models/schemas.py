from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime


class BaseResponse(BaseModel):
    status: str
    message: Optional[str] = None
    data: Optional[Any] = None
    meta: Optional[dict] = None


class SessionCreateReq(BaseModel):
    user_id: str = Field(..., min_length=1)


class SessionCreateResData(BaseModel):
    session_id: str
    user_id: str
    created_at: datetime


class ChatMessageReq(BaseModel):
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)


class ChatMessageResData(BaseModel):
    reply: str
    escalate: bool
    chunks: List[str]


class ChatHistoryItem(BaseModel):
    role: str
    content: str
    escalate: Optional[bool] = None
    chunks: Optional[List[str]] = None
    reason: Optional[str] = None


class SessionListItem(BaseModel):
    id: str
    user_id: str
    created_at: datetime


class ErrorDetail(BaseModel):
    field: str
    issue: str


class ErrorObject(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None


class ErrorResponse(BaseModel):
    status: str = "error"
    error: ErrorObject
