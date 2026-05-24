async def test_create_goal(client, headers):
    resp = await client.post(
        "/api/goals",
        headers=headers,
        json={"name": "Emergency fund", "target_amount": "5000", "current_amount": "1000"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Emergency fund"
    assert body["target_amount"] == "5000.00"
    assert body["current_amount"] == "1000.00"


async def test_create_goal_rejects_invalid_amounts(client, headers):
    resp = await client.post(
        "/api/goals",
        headers=headers,
        json={"name": "Bad goal", "target_amount": "0"},
    )
    assert resp.status_code == 400

    resp = await client.post(
        "/api/goals",
        headers=headers,
        json={"name": "Negative", "target_amount": "100", "current_amount": "-50"},
    )
    assert resp.status_code == 400


async def test_list_goals_only_returns_user_own(client, headers):
    await client.post("/api/goals", headers=headers, json={"name": "Mine", "target_amount": "100"})

    other = await client.post(
        "/api/auth/register",
        json={"email": "other2@example.com", "password": "password123"},
    )
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    await client.post(
        "/api/goals", headers=other_headers, json={"name": "Theirs", "target_amount": "999"}
    )

    mine = await client.get("/api/goals", headers=headers)
    names = [g["name"] for g in mine.json()]
    assert "Mine" in names
    assert "Theirs" not in names


async def test_update_goal_progress(client, headers):
    created = await client.post(
        "/api/goals",
        headers=headers,
        json={"name": "Vacation", "target_amount": "2000", "current_amount": "500"},
    )
    goal_id = created.json()["id"]

    resp = await client.patch(
        f"/api/goals/{goal_id}", headers=headers, json={"current_amount": "1250"}
    )
    assert resp.status_code == 200
    assert resp.json()["current_amount"] == "1250.00"


async def test_delete_goal(client, headers):
    created = await client.post(
        "/api/goals", headers=headers, json={"name": "Tmp", "target_amount": "100"}
    )
    goal_id = created.json()["id"]

    resp = await client.delete(f"/api/goals/{goal_id}", headers=headers)
    assert resp.status_code == 204

    listing = await client.get("/api/goals", headers=headers)
    assert all(g["id"] != goal_id for g in listing.json())


async def test_goals_require_auth(client):
    resp = await client.get("/api/goals")
    assert resp.status_code == 403
