"""
TBM service for TBM queries
"""

import sqlite3
from typing import Optional, List

from backend.config import DATABASE_PATH
from backend.api.schemas.tbm import (
    TbmSummary,
    TbmTableRow,
    TbmSummaryResponse,
    TbmLog,
    TbmParticipant
)
from .base_service import get_date_range


def get_tbm_summary(
    site_id: Optional[int],
    date_str: str,
    period: str
) -> TbmSummaryResponse:
    """Get TBM KPIs and summary table."""
    start_date, end_date = get_date_range(date_str, period)

    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        if site_id:
            # Specific site: group by partner
            tbm_query = """
                SELECT
                    p.id as group_id,
                    p.name as group_name,
                    COUNT(DISTINCT t.id) as tbm_count,
                    COUNT(DISTINCT p.id) as comp_count,
                    COUNT(tp.id) as attendees
                FROM tbm_logs t
                JOIN partners p ON t.partner_id = p.id
                LEFT JOIN tbm_participants tp ON t.id = tp.tbm_id
                WHERE t.site_id = ?
                  AND t.work_date BETWEEN ? AND ?
                GROUP BY p.id
                ORDER BY p.name
            """
            cursor.execute(tbm_query, (site_id, start_date.isoformat(), end_date.isoformat()))

            # Get attendance for comparison
            att_query = """
                SELECT partner_id as group_id, COUNT(*) as total_attendance
                FROM attendance_logs
                WHERE site_id = ? AND work_date BETWEEN ? AND ?
                GROUP BY partner_id
            """
            cursor_att = conn.cursor()
            cursor_att.execute(att_query, (site_id, start_date.isoformat(), end_date.isoformat()))
        else:
            # All sites: group by site
            tbm_query = """
                SELECT
                    s.id as group_id,
                    s.name as group_name,
                    COUNT(DISTINCT t.id) as tbm_count,
                    COUNT(DISTINCT t.partner_id) as comp_count,
                    COUNT(tp.id) as attendees
                FROM tbm_logs t
                JOIN sites s ON t.site_id = s.id
                LEFT JOIN tbm_participants tp ON t.id = tp.tbm_id
                WHERE t.work_date BETWEEN ? AND ?
                GROUP BY s.id
                ORDER BY s.name
            """
            cursor.execute(tbm_query, (start_date.isoformat(), end_date.isoformat()))

            # Get attendance for comparison
            att_query = """
                SELECT site_id as group_id, COUNT(*) as total_attendance
                FROM attendance_logs
                WHERE work_date BETWEEN ? AND ?
                GROUP BY site_id
            """
            cursor_att = conn.cursor()
            cursor_att.execute(att_query, (start_date.isoformat(), end_date.isoformat()))

        tbm_rows = cursor.fetchall()
        attendance_data = {row["group_id"]: row["total_attendance"] for row in cursor_att.fetchall()}

        # Build response
        summary = TbmSummary()
        rows = []

        for row in tbm_rows:
            group_id = row["group_id"]
            total_att = attendance_data.get(group_id, 0)
            attendees = row["attendees"] or 0
            rate = (attendees / total_att * 100) if total_att > 0 else 0.0

            table_row = TbmTableRow(
                id=str(group_id),
                label=row["group_name"],
                comp_count=row["comp_count"] or 0,
                tbm_count=row["tbm_count"] or 0,
                total_attendance=total_att,
                attendees=attendees,
                rate=round(rate, 1)
            )
            rows.append(table_row)

            # Aggregate to summary
            summary.written_tbm_docs += row["tbm_count"] or 0
            summary.total_tbm_attendees += attendees

        # Count participating companies
        summary.participating_companies = len(rows)

        # Calculate overall participation rate
        total_attendance = sum(attendance_data.values())
        if total_attendance > 0:
            summary.participation_rate = round(summary.total_tbm_attendees / total_attendance * 100, 1)

        return TbmSummaryResponse(summary=summary, rows=rows)

    finally:
        conn.close()


def get_tbm_logs(
    site_id: Optional[int],
    date_str: str
) -> List[TbmLog]:
    """Get list of TBM logs."""
    target_date, _ = get_date_range(date_str, "DAILY")

    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        query = """
            SELECT
                t.id,
                t.work_date,
                s.name as site_name,
                p.name as partner_name,
                t.content,
                COUNT(tp.id) as participant_count
            FROM tbm_logs t
            JOIN sites s ON t.site_id = s.id
            JOIN partners p ON t.partner_id = p.id
            LEFT JOIN tbm_participants tp ON t.id = tp.tbm_id
            WHERE t.work_date = ?
        """
        params = [target_date.isoformat()]

        if site_id:
            query += " AND t.site_id = ?"
            params.append(site_id)

        query += " GROUP BY t.id ORDER BY t.work_date DESC, p.name"
        cursor.execute(query, params)

        return [
            TbmLog(
                id=row["id"],
                work_date=row["work_date"],
                site_name=row["site_name"],
                partner_name=row["partner_name"],
                content=row["content"],
                participant_count=row["participant_count"] or 0
            )
            for row in cursor.fetchall()
        ]

    finally:
        conn.close()


def get_tbm_participants(tbm_id: int) -> List[TbmParticipant]:
    """Get participants for a TBM log."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, worker_name
            FROM tbm_participants
            WHERE tbm_id = ?
            ORDER BY id
        """, (tbm_id,))

        return [
            TbmParticipant(
                id=row["id"],
                worker_name=row["worker_name"]
            )
            for row in cursor.fetchall()
        ]

    finally:
        conn.close()


def get_tbm_unconfirmed(
    site_id: int,
    date_str: str,
    period: str,
    partner_id: Optional[int] = None
) -> dict:
    """
    🥚 Easter Egg: TBM 미확인자 조회
    출근했지만 TBM에 참석하지 않은 근로자 목록
    """
    start_date, end_date = get_date_range(date_str, period)

    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # 1. 출근자 목록 조회
        if partner_id:
            att_query = """
                SELECT DISTINCT a.worker_name, a.role, p.name as partner_name, a.work_date
                FROM attendance_logs a
                JOIN partners p ON a.partner_id = p.id
                WHERE a.site_id = ? AND a.partner_id = ?
                  AND a.work_date BETWEEN ? AND ?
            """
            cursor.execute(att_query, (site_id, partner_id, start_date.isoformat(), end_date.isoformat()))
        else:
            att_query = """
                SELECT DISTINCT a.worker_name, a.role, p.name as partner_name, a.work_date
                FROM attendance_logs a
                JOIN partners p ON a.partner_id = p.id
                WHERE a.site_id = ?
                  AND a.work_date BETWEEN ? AND ?
            """
            cursor.execute(att_query, (site_id, start_date.isoformat(), end_date.isoformat()))

        attendance_workers = cursor.fetchall()

        # 2. TBM 참석자 목록 조회
        if partner_id:
            tbm_query = """
                SELECT DISTINCT tp.worker_name
                FROM tbm_participants tp
                JOIN tbm_logs t ON tp.tbm_id = t.id
                WHERE t.site_id = ? AND t.partner_id = ?
                  AND t.work_date BETWEEN ? AND ?
            """
            cursor.execute(tbm_query, (site_id, partner_id, start_date.isoformat(), end_date.isoformat()))
        else:
            tbm_query = """
                SELECT DISTINCT tp.worker_name
                FROM tbm_participants tp
                JOIN tbm_logs t ON tp.tbm_id = t.id
                WHERE t.site_id = ?
                  AND t.work_date BETWEEN ? AND ?
            """
            cursor.execute(tbm_query, (site_id, start_date.isoformat(), end_date.isoformat()))

        tbm_participants_set = {row["worker_name"] for row in cursor.fetchall()}

        # 3. 미확인자 = 출근자 - TBM 참석자
        unconfirmed = []
        for worker in attendance_workers:
            if worker["worker_name"] not in tbm_participants_set:
                unconfirmed.append({
                    "worker_name": worker["worker_name"],
                    "role": worker["role"],
                    "partner_name": worker["partner_name"],
                    "work_date": worker["work_date"]
                })

        # 현장명 조회
        cursor.execute("SELECT name FROM sites WHERE id = ?", (site_id,))
        site_result = cursor.fetchone()
        site_name = site_result["name"] if site_result else "Unknown"

        return {
            "site_id": site_id,
            "site_name": site_name,
            "date": date_str,
            "period": period,
            "total_attendance": len(attendance_workers),
            "tbm_confirmed": len(tbm_participants_set),
            "unconfirmed_count": len(unconfirmed),
            "unconfirmed_workers": unconfirmed
        }

    finally:
        conn.close()
