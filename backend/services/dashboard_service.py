"""
Dashboard service for attendance queries
"""

import sqlite3
from typing import Optional, List, Dict, Any

from backend.config import DATABASE_PATH
from backend.api.schemas.dashboard import (
    DashboardSummary,
    SummaryRow,
    DashboardResponse,
    SeniorWorker,
    Accident
)
from .base_service import get_date_range


def get_dashboard_summary(
    site_id: Optional[int],
    date_str: str,
    period: str
) -> DashboardResponse:
    """Get dashboard KPIs and summary table."""
    start_date, end_date = get_date_range(date_str, period)

    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Build base query
        if site_id:
            # Specific site: group by partner
            query = """
                SELECT
                    p.id as group_id,
                    p.name as group_name,
                    COUNT(*) as total_count,
                    SUM(CASE WHEN a.role = '관리자' THEN 1 ELSE 0 END) as manager_count,
                    SUM(CASE WHEN a.role = '근로자' THEN 1 ELSE 0 END) as worker_count,
                    SUM(CASE WHEN a.is_senior = 1 AND a.role = '관리자' THEN 1 ELSE 0 END) as senior_manager_count,
                    SUM(CASE WHEN a.is_senior = 1 AND a.role = '근로자' THEN 1 ELSE 0 END) as senior_worker_count,
                    SUM(CASE WHEN a.is_senior = 1 THEN 1 ELSE 0 END) as senior_total,
                    SUM(CASE WHEN a.check_out_time IS NOT NULL THEN 1 ELSE 0 END) as checkout_count,
                    SUM(CASE WHEN a.has_accident = 1 THEN 1 ELSE 0 END) as accident_count
                FROM attendance_logs a
                JOIN partners p ON a.partner_id = p.id
                WHERE a.site_id = ?
                  AND a.work_date BETWEEN ? AND ?
                GROUP BY p.id
                ORDER BY p.name
            """
            cursor.execute(query, (site_id, start_date.isoformat(), end_date.isoformat()))
        else:
            # All sites: group by site
            query = """
                SELECT
                    s.id as group_id,
                    s.name as group_name,
                    COUNT(*) as total_count,
                    SUM(CASE WHEN a.role = '관리자' THEN 1 ELSE 0 END) as manager_count,
                    SUM(CASE WHEN a.role = '근로자' THEN 1 ELSE 0 END) as worker_count,
                    SUM(CASE WHEN a.is_senior = 1 AND a.role = '관리자' THEN 1 ELSE 0 END) as senior_manager_count,
                    SUM(CASE WHEN a.is_senior = 1 AND a.role = '근로자' THEN 1 ELSE 0 END) as senior_worker_count,
                    SUM(CASE WHEN a.is_senior = 1 THEN 1 ELSE 0 END) as senior_total,
                    SUM(CASE WHEN a.check_out_time IS NOT NULL THEN 1 ELSE 0 END) as checkout_count,
                    SUM(CASE WHEN a.has_accident = 1 THEN 1 ELSE 0 END) as accident_count
                FROM attendance_logs a
                JOIN sites s ON a.site_id = s.id
                WHERE a.work_date BETWEEN ? AND ?
                GROUP BY s.id
                ORDER BY s.name
            """
            cursor.execute(query, (start_date.isoformat(), end_date.isoformat()))

        rows_data = cursor.fetchall()

        # Build response
        summary = DashboardSummary()
        rows = []

        for row in rows_data:
            total = row["total_count"] or 0
            checkout = row["checkout_count"] or 0
            rate = (checkout / total * 100) if total > 0 else 0.0

            summary_row = SummaryRow(
                id=str(row["group_id"]),
                label=row["group_name"],
                manager_count=row["manager_count"] or 0,
                worker_count=row["worker_count"] or 0,
                total_count=total,
                accident_count=row["accident_count"] or 0,
                senior_manager_count=row["senior_manager_count"] or 0,
                senior_worker_count=row["senior_worker_count"] or 0,
                total_senior_count=row["senior_total"] or 0,
                checkout_count=checkout,
                checkout_rate=round(rate, 1)
            )
            rows.append(summary_row)

            # Aggregate to summary
            summary.total_workers += total
            summary.manager_count += row["manager_count"] or 0
            summary.field_worker_count += row["worker_count"] or 0
            summary.senior_managers += row["senior_manager_count"] or 0
            summary.senior_workers += row["senior_worker_count"] or 0
            summary.senior_total += row["senior_total"] or 0
            summary.checkout_count += checkout
            summary.accident_count += row["accident_count"] or 0

        # Calculate overall checkout rate
        if summary.total_workers > 0:
            summary.checkout_rate = round(summary.checkout_count / summary.total_workers * 100, 1)

        return DashboardResponse(summary=summary, rows=rows)

    finally:
        conn.close()


def get_senior_workers(site_id: Optional[int], date_str: str) -> List[SeniorWorker]:
    """Get list of senior workers (65+)."""
    start_date, end_date = get_date_range(date_str, "DAILY")

    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        query = """
            SELECT
                a.id,
                a.worker_name,
                a.age,
                a.role,
                p.name as partner_name,
                s.name as site_name,
                a.work_date
            FROM attendance_logs a
            JOIN sites s ON a.site_id = s.id
            JOIN partners p ON a.partner_id = p.id
            WHERE a.is_senior = 1
              AND a.work_date = ?
        """
        params = [start_date.isoformat()]

        if site_id:
            query += " AND a.site_id = ?"
            params.append(site_id)

        query += " ORDER BY a.age DESC, a.worker_name"
        cursor.execute(query, params)

        return [
            SeniorWorker(
                id=row["id"],
                name=row["worker_name"],
                age=row["age"] or 0,
                role=row["role"],
                partner=row["partner_name"],
                site=row["site_name"],
                work_date=row["work_date"]
            )
            for row in cursor.fetchall()
        ]

    finally:
        conn.close()


def get_accidents(site_id: Optional[int], date_str: str, period: str) -> List[Accident]:
    """Get list of accidents."""
    start_date, end_date = get_date_range(date_str, period)

    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        query = """
            SELECT
                a.id,
                a.worker_name,
                a.role,
                p.name as partner_name,
                s.name as site_name,
                a.work_date
            FROM attendance_logs a
            JOIN sites s ON a.site_id = s.id
            JOIN partners p ON a.partner_id = p.id
            WHERE a.has_accident = 1
              AND a.work_date BETWEEN ? AND ?
        """
        params = [start_date.isoformat(), end_date.isoformat()]

        if site_id:
            query += " AND a.site_id = ?"
            params.append(site_id)

        query += " ORDER BY a.work_date DESC"
        cursor.execute(query, params)

        return [
            Accident(
                id=row["id"],
                worker_name=row["worker_name"],
                role=row["role"],
                partner=row["partner_name"],
                site=row["site_name"],
                work_date=row["work_date"]
            )
            for row in cursor.fetchall()
        ]

    finally:
        conn.close()
