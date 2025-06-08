from pydantic import BaseModel

class UserCreate(BaseModel):
    employee_id: str
    password: str

class User(BaseModel):
    id: int
    employee_id: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# API仕様書 4.1 のリクエストボディに対応 
class ConversationLog(BaseModel):
    local_id: str
    sender: str
    message: str
    timestamp: str

class ConversationData(BaseModel):
    conversation_id: str
    summary: str
    start_time: str
    end_time: str
    logs: list[ConversationLog]

class ApprovedHistoryCreate(BaseModel):
    employee_id: str
    device_id: str
    conversations: list[ConversationData]