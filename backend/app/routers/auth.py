from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from jose import jwt
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import os, bcrypt

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, os.getenv("JWT_SECRET"), algorithm="HS256")

@router.post("/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password=hash_password(body.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(str(user.id))
    return {"success": True, "token": token, "user": {"id": str(user.id), "name": user.name, "email": user.email}}

@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(str(user.id))
    return {"success": True, "token": token, "user": {"id": str(user.id), "name": user.name, "email": user.email}}