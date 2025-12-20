"""
Simple database connection module for safety.db
This provides a simplified interface as requested in the PRD.
"""

import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional
from contextlib import contextmanager

# Database path
DB_PATH = Path(__file__).parent / "database" / "safety.db"


def get_connection() -> sqlite3.Connection:
    """Get a new database connection with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute a query and return results as list of dicts."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def execute_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Execute a query and return single result as dict."""
    results = execute_query(query, params)
    return results[0] if results else None
