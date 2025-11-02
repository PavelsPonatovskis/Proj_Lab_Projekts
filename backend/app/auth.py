from flask import Blueprint, request
from flask_jwt_extended import create_access_token
from . import db
from .models import User

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/register")
def register():
    payload = request.get_json() or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password")

    if not email or not password:
        return {"error": "email and password are required"}, 400

    if User.query.filter_by(email=email).first():
        return {"error": "email already registered"}, 409

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return {"message": "registered", "token": token}

@auth_bp.post("/login")
def login():
    payload = request.get_json() or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password")

    if not email or not password:
        return {"error": "email and password are required"}, 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return {"error": "invalid credentials"}, 401
    
    token = create_access_token(identity=str(user.id))
    return {"message": "ok", "token": token}
