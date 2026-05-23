from datetime import date

from sqlalchemy import select

from app.models import Transaction, User


async def add_tx(db_session, email, category, amount, on_date, **kwargs):
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    tx = Transaction(
        user_id=user.id,
        amount=amount,
        description="Test",
        category=category,
        date=on_date,
        is_manual=True,
        **kwargs,
    )
    db_session.add(tx)
    await db_session.commit()


async def test_create_budget(client, headers):
    resp = await client.post(
        "/api/budgets/",
        headers=headers,
        json={"category": "Food & Dining", "monthly_limit": "300", "month": "2026-05"},
    )
    assert resp.status_code == 200
    assert resp.json()["monthly_limit"] == "300.00"


async def test_upsert_updates_existing_budget(client, headers):
    payload = {"category": "Food & Dining", "monthly_limit": "300", "month": "2026-05"}
    first = await client.post("/api/budgets/", headers=headers, json=payload)

    payload["monthly_limit"] = "450"
    second = await client.post("/api/budgets/", headers=headers, json=payload)

    assert first.json()["id"] == second.json()["id"]
    assert second.json()["monthly_limit"] == "450.00"


async def test_list_filters_by_month(client, headers):
    await client.post(
        "/api/budgets/",
        headers=headers,
        json={"category": "Food & Dining", "monthly_limit": "300", "month": "2026-05"},
    )
    await client.post(
        "/api/budgets/",
        headers=headers,
        json={"category": "Shopping", "monthly_limit": "100", "month": "2026-04"},
    )

    may = await client.get("/api/budgets/?month=2026-05", headers=headers)
    assert len(may.json()) == 1
    assert may.json()[0]["category"] == "Food & Dining"


async def test_summary_includes_categories_without_budgets(client, headers, db_session):
    await add_tx(db_session, "test@example.com", "Shopping", 50, date(2026, 5, 10))
    await client.post(
        "/api/budgets/",
        headers=headers,
        json={"category": "Food & Dining", "monthly_limit": "300", "month": "2026-05"},
    )

    resp = await client.get("/api/budgets/summary?month=2026-05", headers=headers)
    categories = {item["category"]: item for item in resp.json()}
    assert "Food & Dining" in categories
    assert "Shopping" in categories
    assert categories["Shopping"]["monthly_limit"] is None
    assert categories["Shopping"]["spent"] == "50.00"


async def test_summary_excludes_income_category(client, headers, db_session):
    await add_tx(db_session, "test@example.com", "Income", 2000, date(2026, 5, 1))
    await add_tx(db_session, "test@example.com", "Food & Dining", 30, date(2026, 5, 1))

    resp = await client.get("/api/budgets/summary?month=2026-05", headers=headers)
    categories = {item["category"] for item in resp.json()}
    assert "Income" not in categories
    assert "Food & Dining" in categories


async def test_summary_filters_out_excluded_transactions(client, headers, db_session):
    await add_tx(db_session, "test@example.com", "Shopping", 100, date(2026, 5, 1), excluded=False)
    await add_tx(db_session, "test@example.com", "Shopping", 999, date(2026, 5, 2), excluded=True)

    resp = await client.get("/api/budgets/summary?month=2026-05", headers=headers)
    shopping = next(item for item in resp.json() if item["category"] == "Shopping")
    assert shopping["spent"] == "100.00"


async def test_trend_returns_requested_months(client, headers):
    resp = await client.get("/api/budgets/trend?months=6", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 6


async def test_budgets_require_auth(client):
    resp = await client.get("/api/budgets/?month=2026-05")
    assert resp.status_code == 403
