from sqlalchemy.orm import Session
from . import models, schemas, security

def get_user_by_employee_id(db: Session, employee_id: str):
    """
    社員IDを使用してユーザーをデータベースから取得する
    """
    return db.query(models.User).filter(models.User.employee_id == employee_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    """
    新しいユーザーを作成する
    """
    # パスワードをハッシュ化
    hashed_password = security.get_password_hash(user.password)
    # データベースモデルのインスタンスを作成
    db_user = models.User(employee_id=user.employee_id, hashed_password=hashed_password)
    # データベースセッションに追加
    db.add(db_user)
    # データベースにコミット（保存）
    db.commit()
    # データベースから最新の情報を取得（IDなど）
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, employee_id: str, password: str):
    """
    ユーザーを認証する
    """
    # 社員IDでユーザーを検索
    user = get_user_by_employee_id(db, employee_id=employee_id)
    if not user:
        # ユーザーが存在しない
        return None
    if not security.verify_password(password, user.hashed_password):
        # パスワードが一致しない
        return None
    # 認証成功
    return user