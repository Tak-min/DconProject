from fastapi import FastAPI, Depends, HTTPException, status 
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import crud, models, schemas, security, database
from .database import SessionLocal, engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

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
def get_recommendation(current_user: models.User = Depends(security.get_current_user)):
    #ログイン後にホーム画面に表示するチャット履歴（今回はダミーのプログラム）ステップ１で追加
    return {
        "conversation_id": "conv_rec001",
        "date": "2025-06-07",
        "summary_text": "AI: 「週末のご予定は？」ユーザー: 「友人とハイキングに行く予定です。楽しみです！」",
        "tags": ["週末", "ポジティブ", "お出かけ"]
    }

# ステップ2で追加
@app.get("/history")
def get_local_history(current_user: models.User = Depends(security.get_current_user)):
    """
    デバイスのローカル会話履歴（ダミー）を返す
    API仕様書 3.1 に基づく
    """
    return [
        {
            "conversation_id": "conv_xyz789",
            "start_time": "2025-06-06T15:00:00Z",
            "preview": "ユーザー: 今日の天気はどう？ AI: 晴れていて、お出かけ日和ですよ！",
            "logs": [
                {"id": "log_001", "sender": "user", "message": "今日の天気はどう？", "timestamp": "2025-06-06T15:00:00Z"},
                {"id": "log_002", "sender": "ai", "message": "晴れていて、お出かけ日和ですよ！", "timestamp": "2025-06-06T15:00:05Z"}
            ]
        },
        {
            "conversation_id": "conv_abc456",
            "start_time": "2025-06-05T12:30:00Z",
            "preview": "ユーザー: おすすめのランチは？ AI: 駅前のカフェが人気です。",
            "logs": [
                {"id": "log_003", "sender": "user", "message": "おすすめのランチは？", "timestamp": "2025-06-05T12:30:00Z"},
                {"id": "log_004", "sender": "ai", "message": "駅前のカフェが人気です。特にパスタが美味しいと評判ですよ。", "timestamp": "2025-06-05T12:30:10Z"}
            ]
        }
    ]

# ステップ4で追加
@app.get("/status")
def get_device_status(current_user: models.User = Depends(security.get_current_user)):
    """
    デバイスの稼働状態（ダミー）を返す
    API仕様書 3.3 に基づく
    """
    return {
        "device_id": "device-001",
        "device_status": "online",
        "network_connected": True,
        "ai_ready": True
    }

# フロントエンドのファイルを配信(パスが異なっていたので修正)
app.mount("/", StaticFiles(directory="../frontend", html=True), name="static")