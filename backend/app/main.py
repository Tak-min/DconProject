from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import crud, models, schemas, security
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/register/", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_employee_id(db, employee_id=user.employee_id)
    if db_user:
        raise HTTPException(status_code=400, detail="この社員IDは既に使用されています")
    return crud.create_user(db=db, user=user)

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.authenticate_user(db, employee_id=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="社員IDまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = security.create_access_token(
        data={"sub": user.employee_id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/recommendation")
def get_recommendation():
    #ログイン後にホーム画面に表示するチャット履歴（今回はダミーのプログラム）
    return {
        "conversation_id": "conv_rec001",
        "date": "2025-06-07",
        "summary_text": "AI: 「週末のご予定は？」ユーザー: 「友人とハイキングに行く予定です。楽しみです！」",
        "tags": ["週末", "ポジティブ", "お出かけ"]
    }


# フロントエンドのファイルを配信(パスが異なっていたので修正)
app.mount("/", StaticFiles(directory="../frontend", html=True), name="static")