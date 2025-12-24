from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
import os
from datetime import timedelta

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///app.db")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-key")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

    db.init_app(app)
    jwt.init_app(app)

    # ✅ CORS correctly enabled
    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"]
    )

    from app.auth import auth_bp
    from app.routes_api import routes_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(routes_bp, url_prefix="/api/routes")

    return app
