"""
ETL Orchestration Script for HyunJangTong 2.0
Processes Excel files from data_repository and loads into SQLite database.

Usage:
    python -m backend.etl.run_etl           # 증분 처리 (새 파일만)
    python -m backend.etl.run_etl --reset   # 전체 재처리 (DB 초기화)

    or
    python backend/etl/run_etl.py
    python backend/etl/run_etl.py --reset
"""

import sys
import argparse
import sqlite3
from pathlib import Path
from typing import Dict, Any, Optional, Set
from datetime import datetime

# Add parent directory to path for imports when running as script
if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.config import (
    DATABASE_PATH,
    ATTENDANCE_DIR,
    RISK_ASSESSMENT_DIR,
    TBM_DIR
)
from backend.database.schema import init_db, drop_all_tables
from backend.database.connection import get_or_create_site, get_or_create_partner
from backend.etl.attendance_parser import AttendanceParser
from backend.etl.risk_parser import RiskAssessmentParser
from backend.etl.tbm_parser import TbmParser


def insert_attendance_records(conn: sqlite3.Connection, parsed_data: Dict[str, Any]) -> int:
    """Insert attendance records into database."""
    cursor = conn.cursor()
    meta = parsed_data["metadata"]
    records = parsed_data["records"]

    if not records:
        return 0

    # Get or create site and partner
    site_name = meta.get("site_name") or meta.get("raw_site_project", "Unknown")
    partner_name = meta.get("partner_name", "Unknown")

    site_id = get_or_create_site(conn, site_name)
    partner_id = get_or_create_partner(conn, partner_name)

    work_date = meta.get("work_date")
    if work_date:
        work_date = work_date.isoformat() if hasattr(work_date, 'isoformat') else str(work_date)

    count = 0
    for record in records:
        cursor.execute("""
            INSERT INTO attendance_logs (
                work_date, site_id, partner_id, worker_name, role,
                birth_date, age, is_senior, check_in_time, check_out_time, has_accident
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            work_date,
            site_id,
            partner_id,
            record.get("worker_name"),
            record.get("role", "근로자"),
            record.get("birth_date"),
            record.get("age"),
            1 if record.get("is_senior") else 0,
            record.get("check_in_time"),
            record.get("check_out_time"),
            1 if record.get("has_accident") else 0
        ))
        count += 1

    return count


def insert_risk_records(conn: sqlite3.Connection, parsed_data: Dict[str, Any]) -> Dict[str, int]:
    """Insert risk assessment records into database."""
    cursor = conn.cursor()
    meta = parsed_data["metadata"]
    records = parsed_data["records"]
    confirmations = parsed_data.get("confirmations", [])
    action_results = parsed_data.get("action_results", [])
    filename = parsed_data.get("filename", "")

    # Get or create site and partner
    site_name = meta.get("site_name") or "Unknown"
    partner_name = meta.get("partner_name", "Unknown")

    site_id = get_or_create_site(conn, site_name)
    partner_id = get_or_create_partner(conn, partner_name)

    start_date = meta.get("start_date")
    end_date = meta.get("end_date")
    doc_index = meta.get("doc_index", 0)
    risk_type = meta.get("risk_type", "최초")
    action_result_count = len(action_results)  # 조치이행결과 수

    if start_date:
        start_date = start_date.isoformat() if hasattr(start_date, 'isoformat') else str(start_date)
    if end_date:
        end_date = end_date.isoformat() if hasattr(end_date, 'isoformat') else str(end_date)

    # Insert risk document with action_result_count
    cursor.execute("""
        INSERT INTO risk_docs (site_id, partner_id, start_date, end_date, doc_index, risk_type, action_result_count, filename)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (site_id, partner_id, start_date, end_date, doc_index, risk_type, action_result_count, filename))

    doc_id = cursor.lastrowid

    # Insert risk items (위험요인 + 개선대책)
    item_count = 0
    for record in records:
        cursor.execute("""
            INSERT INTO risk_items (doc_id, risk_factor, measure)
            VALUES (?, ?, ?)
        """, (doc_id, record.get("risk_factor"), record.get("measure")))
        item_count += 1

    # Insert confirmations (for 수시/정기 type)
    confirm_count = 0
    for confirm in confirmations:
        cursor.execute("""
            INSERT INTO risk_confirmations (doc_id, worker_name, position)
            VALUES (?, ?, ?)
        """, (doc_id, confirm.get("worker_name"), confirm.get("position")))
        confirm_count += 1

    return {"items": item_count, "confirmations": confirm_count}


def insert_tbm_records(conn: sqlite3.Connection, parsed_data: Dict[str, Any]) -> int:
    """Insert TBM records into database."""
    cursor = conn.cursor()
    meta = parsed_data["metadata"]
    records = parsed_data["records"]

    # Get or create site and partner
    site_name = meta.get("site_name") or meta.get("raw_site_project", "Unknown")
    partner_name = meta.get("partner_name", "Unknown")

    site_id = get_or_create_site(conn, site_name)
    partner_id = get_or_create_partner(conn, partner_name)

    work_date = meta.get("work_date")
    if work_date:
        work_date = work_date.isoformat() if hasattr(work_date, 'isoformat') else str(work_date)

    content = meta.get("content", "")

    # Insert TBM log
    cursor.execute("""
        INSERT INTO tbm_logs (work_date, site_id, partner_id, content)
        VALUES (?, ?, ?, ?)
    """, (work_date, site_id, partner_id, content))

    tbm_id = cursor.lastrowid

    # Insert participants
    count = 0
    for record in records:
        worker_name = record.get("worker_name")
        if worker_name:
            cursor.execute("""
                INSERT INTO tbm_participants (tbm_id, worker_name)
                VALUES (?, ?)
            """, (tbm_id, worker_name))
            count += 1

    return count


def get_processed_files(conn: sqlite3.Connection, file_type: str) -> Set[str]:
    """Get set of already processed filenames for a given type."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT filename FROM processed_files WHERE file_type = ?",
        (file_type,)
    )
    return {row[0] for row in cursor.fetchall()}


def mark_file_processed(conn: sqlite3.Connection, filename: str, file_type: str) -> None:
    """Mark a file as processed."""
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO processed_files (filename, file_type) VALUES (?, ?)",
        (filename, file_type)
    )


def process_attendance_files(conn: sqlite3.Connection, directory: Path, incremental: bool = True) -> Dict[str, int]:
    """Process attendance Excel files. If incremental=True, skip already processed files."""
    stats = {"files": 0, "records": 0, "errors": 0, "skipped": 0}

    if not directory.exists():
        print(f"Warning: Attendance directory not found: {directory}")
        return stats

    xlsx_files = list(directory.glob("*.xlsx"))
    total_files = len(xlsx_files)

    # Get already processed files if incremental mode
    processed = get_processed_files(conn, "attendance") if incremental else set()
    if incremental and processed:
        print(f"Found {total_files} attendance files ({len(processed)} already processed)")
    else:
        print(f"Found {total_files} attendance files")

    for file_path in xlsx_files:
        # Skip already processed files in incremental mode
        if incremental and file_path.name in processed:
            stats["skipped"] += 1
            continue

        try:
            parser = AttendanceParser(str(file_path))
            parsed = parser.run()
            count = insert_attendance_records(conn, parsed)
            mark_file_processed(conn, file_path.name, "attendance")
            stats["files"] += 1
            stats["records"] += count
            if stats["files"] % 100 == 0:
                print(f"  Processed {stats['files']} new attendance files...")
        except Exception as e:
            stats["errors"] += 1
            print(f"  Error processing {file_path.name}: {e}")

    return stats


def process_risk_files(conn: sqlite3.Connection, directory: Path, incremental: bool = True) -> Dict[str, int]:
    """Process risk assessment Excel files. If incremental=True, skip already processed files."""
    stats = {"files": 0, "items": 0, "confirmations": 0, "errors": 0, "skipped": 0}

    if not directory.exists():
        print(f"Warning: Risk assessment directory not found: {directory}")
        return stats

    xlsx_files = [f for f in directory.glob("*.xlsx") if not f.name.startswith("~$")]
    total_files = len(xlsx_files)

    # Get already processed files if incremental mode
    processed = get_processed_files(conn, "risk") if incremental else set()
    if incremental and processed:
        print(f"Found {total_files} risk assessment files ({len(processed)} already processed)")
    else:
        print(f"Found {total_files} risk assessment files")

    for file_path in xlsx_files:
        # Skip already processed files in incremental mode
        if incremental and file_path.name in processed:
            stats["skipped"] += 1
            continue

        try:
            parser = RiskAssessmentParser(str(file_path))
            parsed = parser.run()
            counts = insert_risk_records(conn, parsed)
            mark_file_processed(conn, file_path.name, "risk")
            stats["files"] += 1
            stats["items"] += counts["items"]
            stats["confirmations"] += counts["confirmations"]
        except Exception as e:
            stats["errors"] += 1
            print(f"  Error processing {file_path.name}: {e}")

    return stats


def process_tbm_files(conn: sqlite3.Connection, directory: Path, incremental: bool = True) -> Dict[str, int]:
    """Process TBM Excel files. If incremental=True, skip already processed files."""
    stats = {"files": 0, "records": 0, "errors": 0, "skipped": 0}

    if not directory.exists():
        print(f"Warning: TBM directory not found: {directory}")
        return stats

    xlsx_files = list(directory.glob("*.xlsx"))
    total_files = len(xlsx_files)

    # Get already processed files if incremental mode
    processed = get_processed_files(conn, "tbm") if incremental else set()
    if incremental and processed:
        print(f"Found {total_files} TBM files ({len(processed)} already processed)")
    else:
        print(f"Found {total_files} TBM files")

    for file_path in xlsx_files:
        # Skip already processed files in incremental mode
        if incremental and file_path.name in processed:
            stats["skipped"] += 1
            continue

        try:
            parser = TbmParser(str(file_path))
            parsed = parser.run()
            count = insert_tbm_records(conn, parsed)
            mark_file_processed(conn, file_path.name, "tbm")
            stats["files"] += 1
            stats["records"] += count
            if stats["files"] % 100 == 0:
                print(f"  Processed {stats['files']} new TBM files...")
        except Exception as e:
            stats["errors"] += 1
            print(f"  Error processing {file_path.name}: {e}")

    return stats


def run_full_etl(reset_db: bool = False) -> None:
    """
    Main ETL orchestration function.

    Args:
        reset_db: If True, drop all tables and recreate schema (full re-process)
                  If False (default), incremental processing (new files only)
    """
    incremental = not reset_db
    mode_str = "FULL RESET" if reset_db else "INCREMENTAL"

    print("=" * 60)
    print(f"HyunJangTong 2.0 ETL Process [{mode_str}]")
    print("=" * 60)
    start_time = datetime.now()

    # Initialize database
    if reset_db:
        print("\n[1/5] Resetting database (full re-process)...")
        drop_all_tables(DATABASE_PATH)
    else:
        print("\n[1/5] Incremental mode - keeping existing data...")

    print("\n[2/5] Initializing database schema...")
    init_db(DATABASE_PATH)

    # Connect to database
    conn = sqlite3.connect(str(DATABASE_PATH))

    try:
        # Process attendance files
        print("\n[3/5] Processing attendance files...")
        att_stats = process_attendance_files(conn, ATTENDANCE_DIR, incremental=incremental)
        if incremental:
            print(f"  Completed: {att_stats['files']} new files, {att_stats['records']} records (skipped {att_stats['skipped']} existing)")
        else:
            print(f"  Completed: {att_stats['files']} files, {att_stats['records']} records, {att_stats['errors']} errors")

        # Process risk assessment files
        print("\n[4/5] Processing risk assessment files...")
        risk_stats = process_risk_files(conn, RISK_ASSESSMENT_DIR, incremental=incremental)
        if incremental:
            print(f"  Completed: {risk_stats['files']} new files, {risk_stats['items']} items (skipped {risk_stats['skipped']} existing)")
        else:
            print(f"  Completed: {risk_stats['files']} files, {risk_stats['items']} items, {risk_stats['confirmations']} confirmations")

        # Process TBM files
        print("\n[5/5] Processing TBM files...")
        tbm_stats = process_tbm_files(conn, TBM_DIR, incremental=incremental)
        if incremental:
            print(f"  Completed: {tbm_stats['files']} new files, {tbm_stats['records']} participants (skipped {tbm_stats['skipped']} existing)")
        else:
            print(f"  Completed: {tbm_stats['files']} files, {tbm_stats['records']} participants, {tbm_stats['errors']} errors")

        # Commit all changes
        conn.commit()

        # Print summary
        elapsed = datetime.now() - start_time
        print("\n" + "=" * 60)
        print("ETL COMPLETE")
        print("=" * 60)
        print(f"Mode: {mode_str}")
        print(f"Database: {DATABASE_PATH}")
        print(f"Total time: {elapsed}")
        print("\nNew files processed:")
        print(f"  Attendance: {att_stats['files']} files, {att_stats['records']} records")
        print(f"  Risk Assessment: {risk_stats['files']} files, {risk_stats['items']} items")
        print(f"  TBM: {tbm_stats['files']} files, {tbm_stats['records']} participants")

        # Print record counts
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sites")
        sites_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM partners")
        partners_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM attendance_logs")
        attendance_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM risk_docs")
        risk_docs_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM tbm_logs")
        tbm_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM processed_files")
        processed_count = cursor.fetchone()[0]

        print(f"\nTotal database records:")
        print(f"  Sites: {sites_count}")
        print(f"  Partners: {partners_count}")
        print(f"  Attendance logs: {attendance_count}")
        print(f"  Risk documents: {risk_docs_count}")
        print(f"  TBM logs: {tbm_count}")
        print(f"  Processed files tracked: {processed_count}")

    finally:
        conn.close()


def main():
    """CLI entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="HyunJangTong 2.0 ETL - Process Excel files into database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m backend.etl.run_etl          # Incremental (new files only)
  python -m backend.etl.run_etl --reset  # Full reset (re-process all)
        """
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset database and re-process all files (default: incremental)"
    )

    args = parser.parse_args()
    run_full_etl(reset_db=args.reset)


if __name__ == "__main__":
    main()
