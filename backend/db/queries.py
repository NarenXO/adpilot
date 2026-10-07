from backend.contracts import load_fixture

def list_incidents() -> list[dict]:
    return load_fixture("incidents")["incidents"]

def get_app_state() -> dict:
    return load_fixture("state")
