async def test_register_creates_user_and_returns_token(client):
    resp = await client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "password": "password123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 20


async def test_register_rejects_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "password123"}
    first = await client.post("/api/auth/register", json=payload)
    assert first.status_code == 200

    second = await client.post("/api/auth/register", json=payload)
    assert second.status_code == 400
    assert "already registered" in second.json()["detail"].lower()


async def test_login_returns_token_for_valid_credentials(client):
    await client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": "password123"},
    )
    resp = await client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "password123"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_login_rejects_wrong_password(client):
    await client.post(
        "/api/auth/register",
        json={"email": "wrong@example.com", "password": "password123"},
    )
    resp = await client.post(
        "/api/auth/login",
        json={"email": "wrong@example.com", "password": "badpass"},
    )
    assert resp.status_code == 401


async def test_login_rejects_unknown_user(client):
    resp = await client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "password123"},
    )
    assert resp.status_code == 401


async def test_me_requires_auth(client):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 403


async def test_me_returns_user_info(client, headers):
    resp = await client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"
