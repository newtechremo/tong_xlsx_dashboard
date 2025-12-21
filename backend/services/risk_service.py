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
    RiskChartData,
    RiskDocTypeStats,
    RiskCompanyRow,
    RiskDailyResponse,
    RiskSiteRow,
    RiskAllSitesResponse,
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


def get_risk_daily_summary(
    site_id: int,
    date_str: str,
    period: str = "DAILY"
) -> RiskDailyResponse:
    """
    위험성평가 통계 (일간/주간/월간 모두 지원).
    협력사별로 문서 타입(최초/수시/정기)별 통계를 반환.
    KPI 추가위험요인 = 수시 문서의 위험요인만 집계
    """
    start_date, end_date = get_date_range(date_str, period)

    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # 해당 기간에 유효한 문서를 협력사별, 타입별로 그룹핑
        query = """
            SELECT
                p.id as partner_id,
                p.name as partner_name,
                d.risk_type,
                COUNT(DISTINCT d.id) as doc_count,
                SUM(CASE WHEN i.risk_factor IS NOT NULL AND i.risk_factor != '' THEN 1 ELSE 0 END) as risk_count,
                SUM(CASE WHEN i.action_result IS NOT NULL AND i.action_result != '' THEN 1 ELSE 0 END) as measure_count
            FROM risk_docs d
            JOIN partners p ON d.partner_id = p.id
            LEFT JOIN risk_items i ON d.id = i.doc_id
            WHERE d.site_id = ?
              AND d.start_date <= ?
              AND d.end_date >= ?
            GROUP BY p.id, d.risk_type
            ORDER BY p.name, d.risk_type
        """
        cursor.execute(query, (site_id, end_date.isoformat(), start_date.isoformat()))
        type_data = cursor.fetchall()

        # 수시 문서의 조치결과(이행) 건수 조회 - action_result가 있는 항목
        # 수시는 조치결과(이행)이 별도로 기록됨
        action_query = """
            SELECT
                p.id as partner_id,
                d.risk_type,
                SUM(CASE WHEN i.action_result IS NOT NULL AND i.action_result != '' THEN 1 ELSE 0 END) as action_count
            FROM risk_docs d
            JOIN partners p ON d.partner_id = p.id
            LEFT JOIN risk_items i ON d.id = i.doc_id
            WHERE d.site_id = ?
              AND d.start_date <= ?
              AND d.end_date >= ?
              AND d.risk_type = '수시'
            GROUP BY p.id
        """
        cursor.execute(action_query, (site_id, end_date.isoformat(), start_date.isoformat()))
        action_data = {row["partner_id"]: row["action_count"] or 0 for row in cursor.fetchall()}

        # 수시 문서의 확인근로자 수 조회
        confirm_query = """
            SELECT
                p.id as partner_id,
                COUNT(DISTINCT rc.worker_name) as confirm_count
            FROM risk_docs d
            JOIN partners p ON d.partner_id = p.id
            LEFT JOIN risk_confirmations rc ON d.id = rc.doc_id
            WHERE d.site_id = ?
              AND d.start_date <= ?
              AND d.end_date >= ?
              AND d.risk_type = '수시'
            GROUP BY p.id
        """
        cursor.execute(confirm_query, (site_id, end_date.isoformat(), start_date.isoformat()))
        confirm_data = {row["partner_id"]: row["confirm_count"] or 0 for row in cursor.fetchall()}

        # 협력사별로 데이터 그룹핑
        partners_map = {}
        for row in type_data:
            partner_id = row["partner_id"]
            if partner_id not in partners_map:
                partners_map[partner_id] = {
                    "id": str(partner_id),
                    "label": row["partner_name"],
                    "doc_types": {},
                    "totals": {"doc": 0, "risk": 0, "measure": 0, "action": 0, "confirm": 0}
                }

            risk_type = row["risk_type"]
            doc_count = row["doc_count"] or 0
            risk_count = row["risk_count"] or 0
            measure_count = row["measure_count"] or 0

            # 수시만 조치결과와 확인근로자가 있음
            if risk_type == "수시":
                action_count = action_data.get(partner_id, 0)
                confirm_count = confirm_data.get(partner_id, 0)
            else:
                action_count = 0
                confirm_count = 0

            partners_map[partner_id]["doc_types"][risk_type] = RiskDocTypeStats(
                doc_type=risk_type,
                doc_count=doc_count,
                risk_count=risk_count,
                measure_count=measure_count,
                action_count=action_count,
                confirm_count=confirm_count
            )

            # 합계 누적
            partners_map[partner_id]["totals"]["doc"] += doc_count
            partners_map[partner_id]["totals"]["risk"] += risk_count
            partners_map[partner_id]["totals"]["measure"] += measure_count
            partners_map[partner_id]["totals"]["action"] += action_count
            partners_map[partner_id]["totals"]["confirm"] += confirm_count

        # RiskCompanyRow 리스트 생성
        rows = []
        summary = RiskSummary()

        for partner_id, data in partners_map.items():
            # 문서 타입별 통계 리스트 (최초, 수시, 정기 순서)
            doc_type_list = []
            for dtype in ["최초", "수시", "정기"]:
                if dtype in data["doc_types"]:
                    doc_type_list.append(data["doc_types"][dtype])
                else:
                    # 해당 타입 문서가 없으면 빈 통계
                    doc_type_list.append(RiskDocTypeStats(doc_type=dtype))

            row = RiskCompanyRow(
                id=data["id"],
                label=data["label"],
                doc_types=doc_type_list,
                total_doc_count=data["totals"]["doc"],
                total_risk_count=data["totals"]["risk"],
                total_measure_count=data["totals"]["measure"],
                total_action_count=data["totals"]["action"],
                total_confirm_count=data["totals"]["confirm"]
            )
            rows.append(row)

            # Summary 집계
            summary.active_documents += data["totals"]["doc"]
            # KPI 추가위험요인: 수시 문서의 위험요인만 집계
            if "수시" in data["doc_types"]:
                summary.risk_factors += data["doc_types"]["수시"].risk_count
            # KPI 조치/이행확인: 수시 문서의 조치결과만 집계
            summary.action_results += data["totals"]["action"]

        summary.participating_companies = len(rows)

        # 차트 데이터 생성 (수시 문서 기준)
        chart_data = []
        current_date = start_date
        while current_date <= end_date:
            date_str_chart = current_date.isoformat()

            # 수시 문서만 조회
            chart_query = """
                SELECT
                    SUM(CASE WHEN i.risk_factor IS NOT NULL AND i.risk_factor != '' THEN 1 ELSE 0 END) as risk_count,
                    SUM(CASE WHEN i.action_result IS NOT NULL AND i.action_result != '' THEN 1 ELSE 0 END) as action_count
                FROM risk_docs d
                LEFT JOIN risk_items i ON d.id = i.doc_id
                WHERE d.site_id = ?
                  AND d.risk_type = '수시'
                  AND d.start_date <= ?
                  AND d.end_date >= ?
            """
            cursor.execute(chart_query, (site_id, date_str_chart, date_str_chart))
            result = cursor.fetchone()
            chart_data.append(RiskChartData(
                date=date_str_chart,
                risk_count=result["risk_count"] or 0,
                action_count=result["action_count"] or 0
            ))

            current_date += timedelta(days=1)

        return RiskDailyResponse(summary=summary, rows=rows, chart_data=chart_data)

    finally:
        conn.close()


def get_risk_all_sites_summary(
    date_str: str,
    period: str = "DAILY"
) -> RiskAllSitesResponse:
    """
    전체 현장 위험성평가 통계 (일간/주간/월간 지원).
    현장별 → 협력사별 → 문서 타입별 통계를 반환.
    KPI 추가위험요인 = 수시 문서의 위험요인만 집계
    """
    start_date, end_date = get_date_range(date_str, period)

    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # 모든 현장/협력사/문서타입별 통계 조회
        query = """
            SELECT
                s.id as site_id,
                s.name as site_name,
                p.id as partner_id,
                p.name as partner_name,
                d.risk_type,
                COUNT(DISTINCT d.id) as doc_count,
                SUM(CASE WHEN i.risk_factor IS NOT NULL AND i.risk_factor != '' THEN 1 ELSE 0 END) as risk_count,
                SUM(CASE WHEN i.action_result IS NOT NULL AND i.action_result != '' THEN 1 ELSE 0 END) as measure_count
            FROM risk_docs d
            JOIN sites s ON d.site_id = s.id
            JOIN partners p ON d.partner_id = p.id
            LEFT JOIN risk_items i ON d.id = i.doc_id
            WHERE d.start_date <= ?
              AND d.end_date >= ?
            GROUP BY s.id, p.id, d.risk_type
            ORDER BY s.name, p.name, d.risk_type
        """
        cursor.execute(query, (end_date.isoformat(), start_date.isoformat()))
        type_data = cursor.fetchall()

        # 수시 문서의 조치결과(이행) 건수 조회
        action_query = """
            SELECT
                s.id as site_id,
                p.id as partner_id,
                SUM(CASE WHEN i.action_result IS NOT NULL AND i.action_result != '' THEN 1 ELSE 0 END) as action_count
            FROM risk_docs d
            JOIN sites s ON d.site_id = s.id
            JOIN partners p ON d.partner_id = p.id
            LEFT JOIN risk_items i ON d.id = i.doc_id
            WHERE d.start_date <= ?
              AND d.end_date >= ?
              AND d.risk_type = '수시'
            GROUP BY s.id, p.id
        """
        cursor.execute(action_query, (end_date.isoformat(), start_date.isoformat()))
        action_data = {}
        for row in cursor.fetchall():
            key = (row["site_id"], row["partner_id"])
            action_data[key] = row["action_count"] or 0

        # 수시 문서의 확인근로자 수 조회
        confirm_query = """
            SELECT
                s.id as site_id,
                p.id as partner_id,
                COUNT(DISTINCT rc.worker_name) as confirm_count
            FROM risk_docs d
            JOIN sites s ON d.site_id = s.id
            JOIN partners p ON d.partner_id = p.id
            LEFT JOIN risk_confirmations rc ON d.id = rc.doc_id
            WHERE d.start_date <= ?
              AND d.end_date >= ?
              AND d.risk_type = '수시'
            GROUP BY s.id, p.id
        """
        cursor.execute(confirm_query, (end_date.isoformat(), start_date.isoformat()))
        confirm_data = {}
        for row in cursor.fetchall():
            key = (row["site_id"], row["partner_id"])
            confirm_data[key] = row["confirm_count"] or 0

        # 현장별 → 협력사별 → 문서타입별 데이터 구조화
        sites_map = {}
        for row in type_data:
            site_id = row["site_id"]
            partner_id = row["partner_id"]
            risk_type = row["risk_type"]

            if site_id not in sites_map:
                sites_map[site_id] = {
                    "id": str(site_id),
                    "label": row["site_name"],
                    "partners": {},
                    "totals": {"comp": 0, "doc": 0, "risk": 0, "measure": 0, "action": 0, "confirm": 0}
                }

            if partner_id not in sites_map[site_id]["partners"]:
                sites_map[site_id]["partners"][partner_id] = {
                    "id": str(partner_id),
                    "label": row["partner_name"],
                    "doc_types": {},
                    "totals": {"doc": 0, "risk": 0, "measure": 0, "action": 0, "confirm": 0}
                }

            doc_count = row["doc_count"] or 0
            risk_count = row["risk_count"] or 0
            measure_count = row["measure_count"] or 0

            # 수시만 조치결과와 확인근로자가 있음
            key = (site_id, partner_id)
            if risk_type == "수시":
                action_count = action_data.get(key, 0)
                confirm_count = confirm_data.get(key, 0)
            else:
                action_count = 0
                confirm_count = 0

            sites_map[site_id]["partners"][partner_id]["doc_types"][risk_type] = RiskDocTypeStats(
                doc_type=risk_type,
                doc_count=doc_count,
                risk_count=risk_count,
                measure_count=measure_count,
                action_count=action_count,
                confirm_count=confirm_count
            )

            # 협력사 합계 누적
            sites_map[site_id]["partners"][partner_id]["totals"]["doc"] += doc_count
            sites_map[site_id]["partners"][partner_id]["totals"]["risk"] += risk_count
            sites_map[site_id]["partners"][partner_id]["totals"]["measure"] += measure_count
            sites_map[site_id]["partners"][partner_id]["totals"]["action"] += action_count
            sites_map[site_id]["partners"][partner_id]["totals"]["confirm"] += confirm_count

        # RiskSiteRow 리스트 생성
        site_rows = []
        summary = RiskSummary()

        for site_id, site_data in sites_map.items():
            company_rows = []

            for partner_id, partner_data in site_data["partners"].items():
                # 문서 타입별 통계 리스트 (최초, 수시, 정기 순서)
                doc_type_list = []
                for dtype in ["최초", "수시", "정기"]:
                    if dtype in partner_data["doc_types"]:
                        doc_type_list.append(partner_data["doc_types"][dtype])
                    else:
                        doc_type_list.append(RiskDocTypeStats(doc_type=dtype))

                company_row = RiskCompanyRow(
                    id=partner_data["id"],
                    label=partner_data["label"],
                    doc_types=doc_type_list,
                    total_doc_count=partner_data["totals"]["doc"],
                    total_risk_count=partner_data["totals"]["risk"],
                    total_measure_count=partner_data["totals"]["measure"],
                    total_action_count=partner_data["totals"]["action"],
                    total_confirm_count=partner_data["totals"]["confirm"]
                )
                company_rows.append(company_row)

                # 현장 합계 누적
                site_data["totals"]["doc"] += partner_data["totals"]["doc"]
                site_data["totals"]["risk"] += partner_data["totals"]["risk"]
                site_data["totals"]["measure"] += partner_data["totals"]["measure"]
                site_data["totals"]["action"] += partner_data["totals"]["action"]
                site_data["totals"]["confirm"] += partner_data["totals"]["confirm"]

            site_row = RiskSiteRow(
                id=site_data["id"],
                label=site_data["label"],
                companies=company_rows,
                total_comp_count=len(company_rows),
                total_doc_count=site_data["totals"]["doc"],
                total_risk_count=site_data["totals"]["risk"],
                total_measure_count=site_data["totals"]["measure"],
                total_action_count=site_data["totals"]["action"],
                total_confirm_count=site_data["totals"]["confirm"]
            )
            site_rows.append(site_row)

            # Summary 집계
            summary.active_documents += site_data["totals"]["doc"]
            # KPI 추가위험요인: 수시 문서의 위험요인만 집계
            for partner_data in site_data["partners"].values():
                if "수시" in partner_data["doc_types"]:
                    summary.risk_factors += partner_data["doc_types"]["수시"].risk_count
            summary.action_results += site_data["totals"]["action"]

        summary.participating_companies = sum(len(s["partners"]) for s in sites_map.values())

        # 차트 데이터 생성 (수시 문서 기준)
        chart_data = []
        current_date = start_date
        while current_date <= end_date:
            date_str_chart = current_date.isoformat()

            # 수시 문서만 조회 (전체 현장)
            chart_query = """
                SELECT
                    SUM(CASE WHEN i.risk_factor IS NOT NULL AND i.risk_factor != '' THEN 1 ELSE 0 END) as risk_count,
                    SUM(CASE WHEN i.action_result IS NOT NULL AND i.action_result != '' THEN 1 ELSE 0 END) as action_count
                FROM risk_docs d
                LEFT JOIN risk_items i ON d.id = i.doc_id
                WHERE d.risk_type = '수시'
                  AND d.start_date <= ?
                  AND d.end_date >= ?
            """
            cursor.execute(chart_query, (date_str_chart, date_str_chart))
            result = cursor.fetchone()
            chart_data.append(RiskChartData(
                date=date_str_chart,
                risk_count=result["risk_count"] or 0,
                action_count=result["action_count"] or 0
            ))

            current_date += timedelta(days=1)

        return RiskAllSitesResponse(summary=summary, rows=site_rows, chart_data=chart_data)

    finally:
        conn.close()
