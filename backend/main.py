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

# Build list of allowed origins — always include local dev + any env-provided URL
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://quant-vault-nine.vercel.app",
    FRONTEND_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# In-memory stores — keyed by email consistently everywhere
fake_users_db: Dict[str, Dict] = {}
user_investments: Dict[str, List[Dict]] = {}  # key = email


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


@app.get("/")
async def root():
    return {"message": "Welcome to QuantVault API"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/signup")
async def signup(user: UserCreate):
    if user.email in fake_users_db:
        raise HTTPException(status_code=409, detail="User already exists")
    hashed_password = hash_password(user.password)
    fake_users_db[user.email] = {
        "email": user.email,
        "hashed_password": hashed_password,
    }
    user_investments[user.email] = []  # key = email
    return {"message": "Signup successful"}


@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # OAuth2PasswordRequestForm uses 'username' field — we treat it as email
    user = fake_users_db.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Token = email (simple approach — no JWT needed for this project)
    return {"access_token": user["email"], "token_type": "bearer"}


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Token is the user's email — look up directly in fake_users_db."""
    user = fake_users_db.get(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ── Investment endpoints — all keyed by email ──────────────────────────────

@app.get("/investments")
async def get_investments(user: dict = Depends(get_current_user)):
    return user_investments.get(user["email"], [])


@app.post("/investments")
async def add_investment(inv: Investment, user: dict = Depends(get_current_user)):
    email = user["email"]
    if email not in user_investments:
        user_investments[email] = []
    user_list = user_investments[email]
    inv.id = (max((i["id"] for i in user_list), default=0) + 1)
    user_list.append(inv.dict())
    return inv


@app.put("/investments/{inv_id}")
async def update_investment(
    inv_id: int, inv_update: Investment, user: dict = Depends(get_current_user)
):
    user_list = user_investments.get(user["email"], [])
    for i, inv in enumerate(user_list):
        if inv["id"] == inv_id:
            user_list[i].update({
                "name": inv_update.name,
                "amount": inv_update.amount,
                "quantity": inv_update.quantity,
                "ticker": inv_update.ticker,
                "is_live": inv_update.is_live,
            })
            return user_list[i]
    raise HTTPException(status_code=404, detail="Investment not found")


@app.delete("/investments/{inv_id}")
async def delete_investment(inv_id: int, user: dict = Depends(get_current_user)):
    user_list = user_investments.get(user["email"], [])
    for i, inv in enumerate(user_list):
        if inv["id"] == inv_id:
            user_list.pop(i)
            return {"message": "Deleted successfully"}
    raise HTTPException(status_code=404, detail="Investment not found")
