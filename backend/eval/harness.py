"""
harness.py
----------
Entry point for `make eval`.
Orchestrates all evaluation modules and outputs a JSON scorecard.

Usage:
    python -m backend.eval.harness [--db PATH] [--output PATH]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Optional


def _resolve_db_path() -> Optional[str]:
    """Try to find the DuckDB database file in known locations."""
    candidates = [
        Path("backend/db/adpilot.db"),
        Path("adpilot.db"),
        Path("db/adpilot.db"),
    ]
    for p in candidates:
        if p.exists():
            return str(p)
    return None


def run_eval(db_path: Optional[str] = None, output_path: Optional[str] = None) -> dict:
    """
    Run the full evaluation harness and return the scorecard as a dict.

    Args:
        db_path: Path to the DuckDB file. Auto-detected if None.
        output_path: Where to write the JSON scorecard. Prints to stdout if None.

    Returns:
        Scorecard as a Python dict.
    """
    import duckdb

    from backend.eval.scorecard import build_scorecard

    conn: Optional[duckdb.DuckDBPyConnection] = None

    # Resolve DB path
    resolved_db = db_path or _resolve_db_path()
    if resolved_db:
        try:
            conn = duckdb.connect(resolved_db, read_only=True)
            print(f"[eval] Connected to DuckDB at: {resolved_db}", file=sys.stderr)
        except Exception as exc:
            print(f"[eval] Warning: could not open DB ({exc}). Falling back to fixtures.", file=sys.stderr)
            conn = None
    else:
        print("[eval] No DuckDB file found. Running in fixture-only mode.", file=sys.stderr)

    # Build scorecard
    scorecard = build_scorecard(conn=conn)
    scorecard_dict = scorecard.model_dump()

    # Close connection
    if conn is not None:
        try:
            conn.close()
        except Exception:
            pass

    # Output
    output_json = json.dumps(scorecard_dict, indent=2, default=str)

    if output_path:
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(output_json, encoding="utf-8")
        print(f"[eval] Scorecard written to: {output_path}", file=sys.stderr)
    else:
        print(output_json)

    return scorecard_dict


def main() -> None:
    parser = argparse.ArgumentParser(
        description="AdPilot Evaluation Harness — generates a full evaluation scorecard."
    )
    parser.add_argument(
        "--db",
        metavar="PATH",
        default=None,
        help="Path to DuckDB database file (auto-detected if not provided).",
    )
    parser.add_argument(
        "--output",
        metavar="PATH",
        default="fixtures/scorecard.json",
        help="Output path for the JSON scorecard (defaults to fixtures/scorecard.json).",
    )
    args = parser.parse_args()

    try:
        run_eval(db_path=args.db, output_path=args.output)
    except Exception as exc:
        print(f"[eval] FATAL: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
