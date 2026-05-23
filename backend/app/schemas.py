import uuid
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TransactionCreate(BaseModel):
    amount: Decimal
    description: str
    category: str | None = None
    date: date


class TransactionUpdate(BaseModel):
    category: str | None = None
    description: str | None = None
    notes: str | None = None
    excluded: bool | None = None


class TransactionOut(BaseModel):
    id: uuid.UUID
    amount: Decimal
    description: str
    merchant_name: str | None = None
    merchant_website: str | None = None
    merchant_logo_url: str | None = None
    iso_currency_code: str | None = None
    authorized_date: date | None = None
    category: str | None
    category_detailed: str | None = None
    payment_channel: str | None = None
    pending: bool = False
    location_city: str | None = None
    location_region: str | None = None
    notes: str | None = None
    date: date
    is_manual: bool
    excluded: bool = False
    account_institution: str | None = None

    model_config = {"from_attributes": True}


class BudgetCreate(BaseModel):
    category: str
    monthly_limit: Decimal
    month: str


class BudgetOut(BaseModel):
    id: uuid.UUID
    category: str
    monthly_limit: Decimal
    month: str

    model_config = {"from_attributes": True}


class BudgetSummaryItem(BaseModel):
    category: str
    monthly_limit: Decimal | None
    spent: Decimal
    remaining: Decimal | None


class PlaidLinkTokenResponse(BaseModel):
    link_token: str


class PlaidExchangeRequest(BaseModel):
    public_token: str
    institution_name: str | None = None


class AccountOut(BaseModel):
    id: uuid.UUID
    institution_name: str | None
    last_cursor: str | None

    model_config = {"from_attributes": True}


class PlaidSyncResponse(BaseModel):
    added: int
    modified: int
    removed: int
