import uuid
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models import Account, Transaction
from app.schemas import (
    PlaidLinkTokenResponse,
    PlaidExchangeRequest,
    AccountOut,
    PlaidSyncResponse,
)
from app.lib import plaid as plaid_lib
from app.lib.claude import categorize_transaction

router = APIRouter()

PLAID_CATEGORY_MAP = {
    "INCOME": "Income",
    "TRANSFER_IN": "Income",
    "TRANSFER_OUT": "Other",
    "LOAN_PAYMENTS": "Bills & Utilities",
    "BANK_FEES": "Bills & Utilities",
    "ENTERTAINMENT": "Entertainment",
    "FOOD_AND_DRINK": "Food & Dining",
    "GENERAL_MERCHANDISE": "Shopping",
    "HOME_IMPROVEMENT": "Shopping",
    "MEDICAL": "Health",
    "PERSONAL_CARE": "Health",
    "GENERAL_SERVICES": "Other",
    "GOVERNMENT_AND_NON_PROFIT": "Other",
    "TRANSPORTATION": "Transportation",
    "TRAVEL": "Travel",
    "RENT_AND_UTILITIES": "Bills & Utilities",
}


def map_category(plaid_tx: dict) -> str:
    pfc = plaid_tx.get("personal_finance_category") or {}
    primary = pfc.get("primary") if isinstance(pfc, dict) else None
    return PLAID_CATEGORY_MAP.get(primary, "Other")


async def categorize_with_fallback(plaid_tx: dict) -> str:
    plaid_category = map_category(plaid_tx)
    if plaid_category != "Other":
        return plaid_category

    description = plaid_tx.get("name") or plaid_tx.get("merchant_name") or ""
    if not description:
        return "Other"

    try:
        return await categorize_transaction(description, float(plaid_tx.get("amount") or 0))
    except Exception:
        return "Other"


@router.get("/accounts", response_model=list[AccountOut])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
):
    result = await db.execute(select(Account).where(Account.user_id == user_id))
    return result.scalars().all()


@router.post("/accounts/{account_id}/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_account_cursor(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    account.last_cursor = None
    await db.commit()


@router.get("/recurring")
async def list_recurring(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
):
    result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = result.scalars().all()

    all_outflow = []
    all_inflow = []
    for account in accounts:
        try:
            data = await plaid_lib.get_recurring(account.plaid_access_token)
        except Exception:
            continue
        for s in data["outflow_streams"]:
            s["institution_name"] = account.institution_name
            all_outflow.append(s)
        for s in data["inflow_streams"]:
            s["institution_name"] = account.institution_name
            all_inflow.append(s)

    return {"outflow_streams": all_outflow, "inflow_streams": all_inflow}


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    await db.execute(delete(Transaction).where(Transaction.account_id == account.id))
    await db.delete(account)
    await db.commit()


@router.post("/link-token", response_model=PlaidLinkTokenResponse)
async def create_link_token(user_id: uuid.UUID = Depends(get_current_user)):
    token = await plaid_lib.create_link_token(str(user_id))
    return PlaidLinkTokenResponse(link_token=token)


@router.post("/exchange-token", status_code=status.HTTP_201_CREATED)
async def exchange_token(
    body: PlaidExchangeRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
):
    access_token, item_id = await plaid_lib.exchange_public_token(body.public_token)
    account = Account(
        user_id=user_id,
        plaid_access_token=access_token,
        plaid_item_id=item_id,
        institution_name=body.institution_name,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return {"account_id": str(account.id)}


@router.post("/sync", response_model=PlaidSyncResponse)
async def sync_transactions(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
):
    result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = result.scalars().all()
    if not accounts:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No linked accounts")

    total_added = 0
    total_modified = 0
    total_removed = 0

    for account in accounts:
        cursor = account.last_cursor
        has_more = True

        while has_more:
            data = await plaid_lib.sync_transactions(account.plaid_access_token, cursor)

            for t in data["added"]:
                pid = t.get("transaction_id")
                existing = await db.execute(
                    select(Transaction).where(Transaction.plaid_transaction_id == pid)
                )
                if existing.scalar_one_or_none():
                    continue

                tx_date = t.get("date")
                if isinstance(tx_date, str):
                    tx_date = date.fromisoformat(tx_date)

                loc = t.get("location") or {}
                pfc = t.get("personal_finance_category") or {}
                authorized = t.get("authorized_date")
                if isinstance(authorized, str):
                    authorized = date.fromisoformat(authorized)
                tx = Transaction(
                    user_id=user_id,
                    account_id=account.id,
                    plaid_transaction_id=pid,
                    amount=Decimal(str(t.get("amount", 0))),
                    description=t.get("name") or t.get("merchant_name") or "Unknown",
                    merchant_name=t.get("merchant_name"),
                    merchant_website=t.get("website"),
                    merchant_logo_url=t.get("logo_url"),
                    iso_currency_code=t.get("iso_currency_code"),
                    authorized_date=authorized,
                    category=await categorize_with_fallback(t),
                    category_detailed=pfc.get("detailed") if isinstance(pfc, dict) else None,
                    payment_channel=t.get("payment_channel"),
                    pending=bool(t.get("pending", False)),
                    location_city=loc.get("city") if isinstance(loc, dict) else None,
                    location_region=loc.get("region") if isinstance(loc, dict) else None,
                    date=tx_date,
                    is_manual=False,
                )
                db.add(tx)
                total_added += 1

            for t in data["modified"]:
                pid = t.get("transaction_id")
                existing = await db.execute(
                    select(Transaction).where(Transaction.plaid_transaction_id == pid)
                )
                tx = existing.scalar_one_or_none()
                if tx:
                    loc = t.get("location") or {}
                    pfc = t.get("personal_finance_category") or {}
                    authorized = t.get("authorized_date")
                    if isinstance(authorized, str):
                        authorized = date.fromisoformat(authorized)
                    tx.amount = Decimal(str(t.get("amount", 0)))
                    tx.description = t.get("name") or t.get("merchant_name") or tx.description
                    tx.merchant_name = t.get("merchant_name") or tx.merchant_name
                    tx.merchant_website = t.get("website") or tx.merchant_website
                    tx.merchant_logo_url = t.get("logo_url") or tx.merchant_logo_url
                    tx.iso_currency_code = t.get("iso_currency_code") or tx.iso_currency_code
                    tx.authorized_date = authorized or tx.authorized_date
                    tx.category = await categorize_with_fallback(t)
                    tx.category_detailed = pfc.get("detailed") if isinstance(pfc, dict) else tx.category_detailed
                    tx.payment_channel = t.get("payment_channel") or tx.payment_channel
                    tx.pending = bool(t.get("pending", False))
                    tx.location_city = loc.get("city") if isinstance(loc, dict) else tx.location_city
                    tx.location_region = loc.get("region") if isinstance(loc, dict) else tx.location_region
                    total_modified += 1

            for t in data["removed"]:
                pid = t.get("transaction_id")
                await db.execute(
                    delete(Transaction).where(Transaction.plaid_transaction_id == pid)
                )
                total_removed += 1

            cursor = data["next_cursor"]
            has_more = data["has_more"]

        account.last_cursor = cursor

    await db.commit()
    return PlaidSyncResponse(added=total_added, modified=total_modified, removed=total_removed)
