from sqlalchemy import select

from app.models import Account, User


async def get_user_id(db_session, email):
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    return user.id


async def test_link_token_endpoint(client, headers):
    resp = await client.post("/api/plaid/link-token", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["link_token"] == "link-sandbox-fake"


async def test_exchange_token_creates_account(client, headers, db_session):
    resp = await client.post(
        "/api/plaid/exchange-token",
        headers=headers,
        json={"public_token": "public-fake", "institution_name": "Chase"},
    )
    assert resp.status_code == 201

    accounts = (await db_session.execute(select(Account))).scalars().all()
    assert len(accounts) == 1
    assert accounts[0].institution_name == "Chase"
    assert accounts[0].plaid_access_token == "access-fake"


async def test_sync_without_accounts_returns_404(client, headers):
    resp = await client.post("/api/plaid/sync", headers=headers)
    assert resp.status_code == 404


async def test_reset_cursor_clears_value(client, headers, db_session):
    user_id = await get_user_id(db_session, "test@example.com")
    account = Account(
        user_id=user_id,
        plaid_access_token="access-fake",
        plaid_item_id="item-fake",
        institution_name="Chase",
        last_cursor="some-cursor",
    )
    db_session.add(account)
    await db_session.commit()
    await db_session.refresh(account)

    resp = await client.post(f"/api/plaid/accounts/{account.id}/reset", headers=headers)
    assert resp.status_code == 204

    await db_session.refresh(account)
    assert account.last_cursor is None


async def test_recurring_endpoint_returns_streams(client, headers, db_session):
    user_id = await get_user_id(db_session, "test@example.com")
    db_session.add(
        Account(
            user_id=user_id,
            plaid_access_token="access-fake",
            plaid_item_id="item-fake",
            institution_name="Chase",
        )
    )
    await db_session.commit()

    resp = await client.get("/api/plaid/recurring", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "outflow_streams" in body
    assert "inflow_streams" in body


async def test_balances_endpoint_no_accounts(client, headers):
    from decimal import Decimal

    resp = await client.get("/api/plaid/balances", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert Decimal(body["assets"]) == Decimal("0")
    assert Decimal(body["liabilities"]) == Decimal("0")
    assert Decimal(body["net_worth"]) == Decimal("0")
    assert body["accounts"] == []


async def test_balances_aggregates_assets_and_liabilities(client, headers, db_session):
    from unittest.mock import patch, AsyncMock

    user_id = await get_user_id(db_session, "test@example.com")
    db_session.add(
        Account(
            user_id=user_id,
            plaid_access_token="access-fake",
            plaid_item_id="item-fake",
            institution_name="Chase",
        )
    )
    await db_session.commit()

    sample = [
        {"name": "Checking", "type": "depository", "subtype": "checking", "mask": "0000",
         "balances": {"current": 1500.50, "available": 1200, "iso_currency_code": "USD"}},
        {"name": "Sapphire", "type": "credit", "subtype": "credit card", "mask": "1111",
         "balances": {"current": 432.10, "available": None, "iso_currency_code": "USD"}},
    ]
    with patch("app.lib.plaid.get_accounts", AsyncMock(return_value=sample)):
        resp = await client.get("/api/plaid/balances", headers=headers)

    from decimal import Decimal
    assert resp.status_code == 200
    body = resp.json()
    assert Decimal(body["assets"]) == Decimal("1500.50")
    assert Decimal(body["liabilities"]) == Decimal("432.10")
    assert Decimal(body["net_worth"]) == Decimal("1068.40")
    assert len(body["accounts"]) == 2


async def test_plaid_routes_require_auth(client):
    resp = await client.post("/api/plaid/link-token")
    assert resp.status_code == 403
