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