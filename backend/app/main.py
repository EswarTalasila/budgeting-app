import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.lib.rate_limit import limiter
from app.routes import auth, transactions, budgets, plaid, goals


DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "capacitor://localhost",
    "http://100.83.62.115:5173",
]


def get_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    configured = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return list(dict.fromkeys(configured + DEV_ORIGINS))


def is_production() -> bool:
    return os.getenv("ENVIRONMENT", "").lower() == "production"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        if is_production():
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response


_PROD = is_production()

app = FastAPI(
    title="Clover API",
    docs_url=None if _PROD else "/docs",
    redoc_url=None if _PROD else "/redoc",
    openapi_url=None if _PROD else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=r"^(http://192\.168\.[0-9]+\.[0-9]+:5173|http://100\.[0-9]+\.[0-9]+\.[0-9]+:5173)$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/auth")
app.include_router(transactions.router, prefix="/api/transactions")
app.include_router(budgets.router, prefix="/api/budgets")
app.include_router(plaid.router, prefix="/api/plaid")
app.include_router(goals.router, prefix="/api/goals")
