from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# データベースファイルのパスを指定
SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

# SQLAlchemyのエンジンを作成
# connect_args はSQLiteを使用する場合にのみ必要です。
# FastAPIが複数のスレッドでデータベースとやり取りする可能性があるため、この設定が推奨されます。
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# データベースセッションを作成するためのクラス
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ORMモデル（models.pyで定義）が継承するためのベースクラス
Base = declarative_base()

def get_db():
    """
    データベースセッションを提供する依存性注入用の関数
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()