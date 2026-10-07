from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_api_health_and_state():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res = client.get("/api/state")
    assert res.status_code == 200

def test_api_sim_tick_and_killswitch():
    # Test Tick API
    res = client.post("/api/sim/tick")
    assert res.status_code == 200
    assert "sim_date" in res.json()

    # Test Killswitch API
    res = client.post("/api/killswitch", json={"active": True})
    assert res.status_code == 200
    assert res.json()["killswitch_active"] is True

    res = client.post("/api/killswitch", json={"active": False})
    assert res.status_code == 200
    assert res.json()["killswitch_active"] is False

def test_api_incidents_and_proof():
    res = client.get("/api/incidents")
    assert res.status_code == 200

    res = client.get("/api/proof/scorecard")
    assert res.status_code == 200
