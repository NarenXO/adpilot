import json
from pathlib import Path
from typing import Any

FIXTURES_DIR = Path(__file__).parent.parent.parent / "fixtures"

def load_fixture(name: str) -> dict[str, Any]:
    if not name.endswith(".json"):
        name = f"{name}.json"
    file_path = FIXTURES_DIR / name
    with open(file_path, "r") as f:
        return json.load(f)
