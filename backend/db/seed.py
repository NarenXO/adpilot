"""
backend/db/seed.py
==================
Populates DuckDB with simulator data.
"""
import os
from pathlib import Path
from backend.db.connection import get_connection
import backend.db.connection as conn_module
from backend.simulator.world import generate_world
from backend.simulator.inject import inject_golden_path

def seed_db(seed: int = 42, db_path: str = "data/adpilot.duckdb") -> None:
    target_path = Path(db_path)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Override connection path so get_connection uses it
    conn_module.DB_PATH = target_path

    # Generate and inject
    base_dfs = generate_world(seed=seed)
    mod_dfs, truth_df = inject_golden_path(base_dfs, seed=seed)
    
    # This will also run init_db(conn) and create all tables
    conn = get_connection()
    
    # Insert DataFrames
    tables = [
        "ad_performance", "sales", "sku_master", "inventory", 
        "ga_funnel", "creatives", "external_events"
    ]
    
    for table_name in tables:
        df = mod_dfs[table_name]
        conn.execute(f"INSERT INTO {table_name} SELECT * FROM df")
        
    df_truth = truth_df
    conn.execute("INSERT INTO truth SELECT * FROM df_truth")
    
    print("--- Seed Summary ---")
    for table in tables + ["truth"]:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"{table}: {count} rows")
        
    conn.close()
        
def reset_db(db_path: str = "data/adpilot.duckdb") -> None:
    path = Path(db_path)
    if path.exists():
        path.unlink()
    
    wal_path = path.with_name(path.name + ".wal")
    if wal_path.exists():
        wal_path.unlink()
        
    seed_db(db_path=db_path)

if __name__ == "__main__":
    reset_db()
