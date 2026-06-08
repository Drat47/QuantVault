# Complete main.py with authentication-based token and investment APIs
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Dict, List
from pydantic import EmailStr
import bcrypt
import os

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

app = FastAPI(title="QuantVault API", version="1.0.0")

# Read allowed frontend origin from env (set on Render dashboard)
# Falls back to localhost for local development
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

fake_users_db: Dict[str, Dict] = {}
user_investments: Dict[str, List[Dict]] = {}

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Investment(BaseModel):
    id: int | None = None
    name: str
    amount: float
    quantity: float | None = 1.0
    ticker: str | None = ""
    is_live: bool | None = True

@app.post("/signup")
async def signup(user: UserCreate):
    if user.email in fake_users_db:
        raise HTTPException(status_code=409, detail="User already exists")
    hashed_password = hash_password(user.password)
    username = user.email.split("@")[0]  # email se username banaya
    fake_users_db[user.email] = {
        "username": username,
        "email": user.email,
        "hashed_password": hashed_password
    }
    user_investments[user.email] = []
    return {"message": "Signup successful"}


@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = fake_users_db.get(form_data.username)  # yahan username me email bhejata h frontend
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {"access_token": user["email"], "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme)):
    user = fake_users_db.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return user

@app.get("/users")
async def get_all_users():
    return fake_users_db

@app.get("/")
async def root():
    return {"message": "Welcome to QuantVault API"}

@app.get("/investments")
async def get_investments(user: dict = Depends(get_current_user)):
    return user_investments.get(user["username"], [])

@app.post("/investments")
async def add_investment(inv: Investment, user: dict = Depends(get_current_user)):
    inv.id = 1
    if user["username"] not in user_investments:
        user_investments[user["username"]] = []
    user_list = user_investments[user["username"]]
    if user_list:
        inv.id = max(i["id"] for i in user_list) + 1
    user_list.append(inv.dict())
    return inv

@app.put("/investments/{inv_id}")
async def update_investment(inv_id: int, inv_update: Investment, user: dict = Depends(get_current_user)):
    user_list = user_investments.get(user["username"], [])
    for i, inv in enumerate(user_list):
        if inv["id"] == inv_id:
            user_list[i]["name"] = inv_update.name
            user_list[i]["amount"] = inv_update.amount
            user_list[i]["quantity"] = inv_update.quantity
            user_list[i]["ticker"] = inv_update.ticker
            user_list[i]["is_live"] = inv_update.is_live
            return user_list[i]
    raise HTTPException(status_code=404, detail="Investment not found")

@app.delete("/investments/{inv_id}")
async def delete_investment(inv_id: int, user: dict = Depends(get_current_user)):
    user_list = user_investments.get(user["username"], [])
    for i, inv in enumerate(user_list):
        if inv["id"] == inv_id:
            user_list.pop(i)
            return {"message": "Deleted successfully"}
    raise HTTPException(status_code=404, detail="Investment not found")
