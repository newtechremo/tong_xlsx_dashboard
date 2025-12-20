"""
Risk Assessment service for risk document queries
"""

import sqlite3
from typing import Optional, List

from backend.config import DATABASE_PATH
from datetime import timedelta

from backend.api.schemas.risk import (
    RiskSummary,
    RiskTableRow,
    RiskSummaryResponse,
    RiskDocument,
    RiskItem,
    RiskChartData
)
from .base_service import get_date_range


def get_risk_summary(
    site_id: Optional[int],
    date_str: str,
    period: str
) -> RiskSummaryResponse:
    """Get risk assessment KPIs and summary table."""
    start_date, end_date = get_date_range(date_str, period)

    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        if site_id:
            # Specific site: group by partner
            query = """
                SELECT
                    p.id as group_id,
                    p.name as group_name,
                    COUNT(DISTINCT d.id) as doc_count,
                    COUNT(DISTINCT p.id) as comp_count,
                    SUM(CASE WHEN i.risk_factor IS NOT NULL AND i.risk_factor != '' THEN 1 ELSE 0 END) as risk_count,
                    SUM(CASE WHEN i.action_result IS NOT NULL AND i.action_result != '' THEN 1 ELSE 0 END) as action_count
                FROM risk_docs d
                JOIN partners p ON d.partner_id = p.id
                LEFT JOIN risk_items i ON d.id = i.doc_id
                WHERE d.site_id = ?
                  AND d.start_date <= ?
                  AND d.end_date >= ?
                GROUP BY p.id
                ORDER BY p.name
            """
            cursor.execute(query, (site_id, end_date.isoformat(), start_date.isoformat()))
        else:
            # All sites: group by site
            query = """
                SELECT
                    s.id as group_id,
                    s.name as group_name,
                    COUNT(DISTINCT d.id) as doc_count,
                    COUNT(DISTINCT d.partner_id) as comp_count,
                    SUM(CASE WHEN i.risk_factor IS NOT NULL AND i.risk_factor != '' THEN 1 ELSE 0 END) as risk_count,
                    SUM(CASE WHEN i.action_result IS NOT NULL AND i.action_result != '' THEN 1 ELSE 0 END) as action_count
                FROM risk_docs d
                JOIN sites s ON d.site_id = s.id
                LEFT JOIN risk_items i ON d.id = i.doc_id
                WHERE d.start_date <= ?
                  AND d.end_date >= ?
                GROUP BY s.id
                ORDER BY s.name
            """
            cursor.execute(query, (end_date.isoformat(), start_date.isoformat()))

        rows_data = cursor.fetchall()

        # Also get worker count from attendance for the same period
        if site_id:
            worker_query = """
                SELECT partner_id, COUNT(DISTINCT worker_name) as worker_count
                FROM attendance_logs
                WHERE site_id = ? AND work_date BETWEEN ? AND ?
                GROUP BY partner_id
            """
            cursor.execute(worker_query, (site_id, start_date.isoformat(), end_date.isoformat()))
        else:
            worker_query = """
                SELECT site_id, COUNT(DISTINCT worker_name) as worker_count
                FROM attendance_logs
                WHERE work_date BETWEEN ? AND ?
                GROUP BY site_id
            """
            cursor.execute(worker_query, (start_date.isoformat(), end_date.isoformat()))

        worker_counts = {row["site_id" if not site_id else "partner_id"]: row["worker_count"]
                        for row in cursor.fetchall()}

        # Build response
        summary = RiskSummary()
        rows = []

        for row in rows_data:
            group_id = row["group_id"]
            worker_count = worker_counts.get(group_id, 0)

            table_row = RiskTableRow(
                id=str(group_id),
                label=row["group_name"],
                comp_count=row["comp_count"] or 0,
                doc_count=row["doc_count"] or 0,
                risk_count=row["risk_count"] or 0,
                action_count=row["action_count"] or 0,
                worker_count=worker_count
            )
            rows.append(table_row)

            # Aggregate to summary
            summary.active_documents += row["doc_count"] or 0
            summary.risk_factors += row["risk_count"] or 0
            summary.action_results += row["action_count"] or 0

        # Count participating companies
        summary.participating_companies = len(rows)

        # Generate chart data for date range
        chart_data = []
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.isoformat()

            # Count risk factors and action results for documents that overlap this date
            if site_id:
                chart_query = """
                    SELECT
                        SUM(CASE WHEN i.risk_factor IS NOT NULL AND i.risk_factor != '' THEN 1 ELSE 0 END) as risk_count,
                        SUM(CASE WHEN i.action_result IS NOT NULL AND i.action_result != '' THEN 1 ELSE 0 END) as action_count
                    FROM risk_docs d
                    LEFT JOIN risk_items i ON d.id = i.doc_id
                    WHERE d.site_id = ?
                      AND d.start_date <= ?
                      AND d.end_date >= ?
                """
                cursor.execute(chart_query, (site_id, date_str, date_str))
            else:
                chart_query = """
                    SELECT
                        SUM(CASE WHEN i.risk_factor IS NOT NULL AND i.risk_factor != '' THEN 1 ELSE 0 END) as risk_count,
                        SUM(CASE WHEN i.action_result IS NOT NULL AND i.action_result != '' THEN 1 ELSE 0 END) as action_count
                    FROM risk_docs d
                    LEFT JOIN risk_items i ON d.id = i.doc_id
                    WHERE d.start_date <= ?
                      AND d.end_date >= ?
                """
                cursor.execute(chart_query, (date_str, date_str))

            result = cursor.fetchone()
            chart_data.append(RiskChartData(
                date=date_str,
                risk_count=result["risk_count"] or 0,
                action_count=result["action_count"] or 0
            ))

            current_date += timedelta(days=1)

        return RiskSummaryResponse(summary=summary, rows=rows, chart_data=chart_data)

    finally:
        conn.close()


def get_risk_documents(
    site_id: Optional[int],
    date_str: str,
    period: str
) -> List[RiskDocument]:
    """Get list of risk documents."""
    start_date, end_date = get_date_range(date_str, period)

    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        query = """
            SELECT
                d.id,
                s.name as site_name,
                p.name as partner_name,
                d.start_date,
                d.end_date,
                d.filename,
                COUNT(i.id) as item_count
            FROM risk_docs d
            JOIN sites s ON d.site_id = s.id
            JOIN partners p ON d.partner_id = p.id
            LEFT JOIN risk_items i ON d.id = i.doc_id
            WHERE d.start_date <= ?
              AND d.end_date >= ?
        """
        params = [end_date.isoformat(), start_date.isoformat()]

        if site_id:
            query += " AND d.site_id = ?"
            params.append(site_id)

        query += " GROUP BY d.id ORDER BY d.start_date DESC"
        cursor.execute(query, params)

        return [
            RiskDocument(
                id=row["id"],
                site_name=row["site_name"],
                partner_name=row["partner_name"],
                start_date=row["start_date"],
                end_date=row["end_date"],
                filename=row["filename"],
                item_count=row["item_count"] or 0
            )
            for row in cursor.fetchall()
        ]

    finally:
        conn.close()


def get_risk_items(doc_id: int) -> List[RiskItem]:
    """Get risk items for a document."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, risk_factor, action_result
            FROM risk_items
            WHERE doc_id = ?
            ORDER BY id
        """, (doc_id,))

        return [
            RiskItem(
                id=row["id"],
                risk_factor=row["risk_factor"],
                action_result=row["action_result"]
            )
            for row in cursor.fetchall()
        ]

    finally:
        conn.close()
