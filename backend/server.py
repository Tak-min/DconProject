#!/usr/bin/env python3
"""
FastAPI サーバー起動スクリプト
Ngrok での外部公開に対応した設定
"""

import uvicorn
import os
from pathlib import Path

if __name__ == "__main__":
    # サーバー設定
    HOST = "0.0.0.0"  # 外部からのアクセスを許可
    PORT = 8000
    
    # 開発モードでの起動
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=True,  # ファイル変更時の自動リロード
        access_log=True,  # アクセスログの出力
        log_level="info"  # ログレベル
    )
