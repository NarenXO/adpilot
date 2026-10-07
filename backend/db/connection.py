import os
from pathlib import Path
import duckdb

DB_PATH = Path("data/adpilot.duckdb")

def get_connection() -> duckdb.DuckDBPyConnection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = duckdb.connect(str(DB_PATH))
    from backend.db.ddl import init_db
    init_db(conn)
    return conn
