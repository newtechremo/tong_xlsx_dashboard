"""
Database schema for HyunJangTong 2.0 Safety Management System
"""

import sqlite3
from pathlib import Path

SCHEMA_SQL = """
-- Master tables
CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- 1. Attendance logs (출퇴근)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_date DATE NOT NULL,
    site_id INTEGER NOT NULL,
    partner_id INTEGER NOT NULL,
    worker_name TEXT NOT NULL,
    role TEXT NOT NULL,  -- '관리자' or '근로자'
    birth_date DATE,
    age INTEGER,
    is_senior BOOLEAN DEFAULT 0,  -- 65세 이상
    check_in_time TIME,
    check_out_time TIME,
    has_accident BOOLEAN DEFAULT 0,
    FOREIGN KEY(site_id) REFERENCES sites(id),
    FOREIGN KEY(partner_id) REFERENCES partners(id)
);

-- 2. Risk Assessment (위험성평가)
CREATE TABLE IF NOT EXISTS risk_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    partner_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    doc_index INTEGER DEFAULT 0,
    risk_type TEXT NOT NULL DEFAULT '최초',  -- '최초', '수시', '정기'
    action_result_count INTEGER DEFAULT 0,  -- 조치이행결과 수 (수시/정기만 해당)
    filename TEXT,
    FOREIGN KEY(site_id) REFERENCES sites(id),
    FOREIGN KEY(partner_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS risk_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER NOT NULL,
    risk_factor TEXT,
    measure TEXT,  -- 개선대책
    FOREIGN KEY(doc_id) REFERENCES risk_docs(id)
);

CREATE TABLE IF NOT EXISTS risk_confirmations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER NOT NULL,
    worker_name TEXT NOT NULL,
    position TEXT,  -- 직종
    FOREIGN KEY(doc_id) REFERENCES risk_docs(id)
);

-- 3. TBM (Tool Box Meeting)
CREATE TABLE IF NOT EXISTS tbm_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_date DATE NOT NULL,
    site_id INTEGER NOT NULL,
    partner_id INTEGER NOT NULL,
    content TEXT,
    FOREIGN KEY(site_id) REFERENCES sites(id),
    FOREIGN KEY(partner_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS tbm_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tbm_id INTEGER NOT NULL,
    worker_name TEXT NOT NULL,
    FOREIGN KEY(tbm_id) REFERENCES tbm_logs(id)
);

-- 4. ETL Tracking (처리된 파일 추적)
CREATE TABLE IF NOT EXISTS processed_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE NOT NULL,
    file_type TEXT NOT NULL,  -- 'attendance', 'risk', 'tbm'
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_date_site ON attendance_logs(work_date, site_id);
CREATE INDEX IF NOT EXISTS idx_attendance_partner ON attendance_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_risk_docs_dates ON risk_docs(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_risk_docs_site ON risk_docs(site_id);
CREATE INDEX IF NOT EXISTS idx_risk_items_doc ON risk_items(doc_id);
CREATE INDEX IF NOT EXISTS idx_tbm_date_site ON tbm_logs(work_date, site_id);
CREATE INDEX IF NOT EXISTS idx_tbm_participants ON tbm_participants(tbm_id);
CREATE INDEX IF NOT EXISTS idx_processed_files_name ON processed_files(filename);
"""


def init_db(db_path: Path) -> None:
    """Initialize database with schema."""
    # Ensure directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Execute schema
    cursor.executescript(SCHEMA_SQL)

    conn.commit()
    conn.close()
    print(f"Database initialized: {db_path}")


def drop_all_tables(db_path: Path) -> None:
    """Drop all tables (for re-initialization)."""
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    tables = [
        "processed_files",
        "tbm_participants",
        "tbm_logs",
        "risk_confirmations",
        "risk_items",
        "risk_docs",
        "attendance_logs",
        "partners",
        "sites"
    ]

    for table in tables:
        cursor.execute(f"DROP TABLE IF EXISTS {table}")

    conn.commit()
    conn.close()
    print("All tables dropped")


if __name__ == "__main__":
    from backend.config import DATABASE_PATH
    init_db(DATABASE_PATH)
