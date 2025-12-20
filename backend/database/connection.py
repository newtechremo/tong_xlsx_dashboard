"""
Database connection management for SQLite
"""

import sqlite3
from contextlib import contextmanager
from typing import Generator
from pathlib import Path

from backend.config import DATABASE_PATH


def get_connection(db_path: Path = DATABASE_PATH) -> sqlite3.Connection:
    """Get a new database connection."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row  # Enable dict-like access
    return conn


@contextmanager
def get_db(db_path: Path = DATABASE_PATH) -> Generator[sqlite3.Connection, None, None]:
    """Context manager for database connections."""
    conn = get_connection(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_or_create_site(conn: sqlite3.Connection, name: str) -> int:
    """Get site ID, creating if doesn't exist."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM sites WHERE name = ?", (name,))
    row = cursor.fetchone()
    if row:
        return row[0]
    cursor.execute("INSERT INTO sites (name) VALUES (?)", (name,))
    return cursor.lastrowid


def get_or_create_partner(conn: sqlite3.Connection, name: str) -> int:
    """Get partner ID, creating if doesn't exist."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM partners WHERE name = ?", (name,))
    row = cursor.fetchone()
    if row:
        return row[0]
    cursor.execute("INSERT INTO partners (name) VALUES (?)", (name,))
    return cursor.lastrowid
