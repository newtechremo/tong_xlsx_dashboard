"""
Dashboard API routes - Consolidated endpoints for all dashboard data
PRD 요구사항에 맞춰 모든 대시보드 엔드포인트를 /api/dashboard/* 하위에 통합
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query

from backend.api.schemas.dashboard import (
    DashboardResponse,
    SeniorWorker,
    Accident
)
from backend.api.schemas.risk import RiskSummaryResponse
from backend.api.schemas.tbm import TbmSummaryResponse
from backend.services.dashboard_service import (
    get_dashboard_summary,
    get_senior_workers,
    get_accidents
)
from backend.services.risk_service import get_risk_summary
from backend.services.tbm_service import get_tbm_summary
from backend.db import execute_query

router = APIRouter()


# ============================================================
# 1. GET /api/dashboard/summary - 전체 KPI 카드용 데이터
# ============================================================
@router.get("/summary", response_model=DashboardResponse)
async def dashboard_summary(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
):
    """
    전체 KPI 카드용 데이터 조회

    Returns:
    - 총 출근자 (관리자 + 근로자)
    - 고령자 (65세 이상)
    - 퇴근율
    - 사고 현황
    """
    return get_dashboard_summary(site_id, date, period)


# ============================================================
# 2. GET /api/dashboard/attendance - 출퇴근 현황 데이터
# ============================================================
@router.get("/attendance")
async def dashboard_attendance(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
) -> Dict[str, Any]:
    """
    출퇴근 현황 데이터 조회 (PRD 4.1 로직)

    Returns:
    - 현장별/소속별 출근 현황
    - 고령자 통계
    - 퇴근율
    """
    from backend.services.base_service import get_date_range
    start_date, end_date = get_date_range(date, period)

    # 현장별 출퇴근 통계
    if site_id:
        # 특정 현장 → 소속별 그룹핑
        query = """
            SELECT
                p.id as partner_id,
                p.name as partner_name,
                COUNT(*) as total_count,
                SUM(CASE WHEN a.role = '관리자' THEN 1 ELSE 0 END) as manager_count,
                SUM(CASE WHEN a.role = '근로자' THEN 1 ELSE 0 END) as worker_count,
                SUM(CASE WHEN a.is_senior = 1 THEN 1 ELSE 0 END) as senior_count,
                SUM(CASE WHEN a.check_out_time IS NOT NULL THEN 1 ELSE 0 END) as checkout_count,
                SUM(CASE WHEN a.has_accident = 1 THEN 1 ELSE 0 END) as accident_count
            FROM attendance_logs a
            JOIN partners p ON a.partner_id = p.id
            WHERE a.site_id = ?
              AND a.work_date BETWEEN ? AND ?
            GROUP BY p.id
            ORDER BY p.name
        """
        rows = execute_query(query, (site_id, start_date.isoformat(), end_date.isoformat()))
    else:
        # 전체 현장 → 현장별 그룹핑
        query = """
            SELECT
                s.id as site_id,
                s.name as site_name,
                COUNT(*) as total_count,
                SUM(CASE WHEN a.role = '관리자' THEN 1 ELSE 0 END) as manager_count,
                SUM(CASE WHEN a.role = '근로자' THEN 1 ELSE 0 END) as worker_count,
                SUM(CASE WHEN a.is_senior = 1 THEN 1 ELSE 0 END) as senior_count,
                SUM(CASE WHEN a.check_out_time IS NOT NULL THEN 1 ELSE 0 END) as checkout_count,
                SUM(CASE WHEN a.has_accident = 1 THEN 1 ELSE 0 END) as accident_count
            FROM attendance_logs a
            JOIN sites s ON a.site_id = s.id
            WHERE a.work_date BETWEEN ? AND ?
            GROUP BY s.id
            ORDER BY s.name
        """
        rows = execute_query(query, (start_date.isoformat(), end_date.isoformat()))

    # 전체 합계 계산
    totals = {
        "total_count": sum(r["total_count"] for r in rows),
        "manager_count": sum(r["manager_count"] for r in rows),
        "worker_count": sum(r["worker_count"] for r in rows),
        "senior_count": sum(r["senior_count"] for r in rows),
        "checkout_count": sum(r["checkout_count"] for r in rows),
        "accident_count": sum(r["accident_count"] for r in rows),
    }
    totals["checkout_rate"] = round(
        (totals["checkout_count"] / totals["total_count"] * 100) if totals["total_count"] > 0 else 0, 1
    )

    return {
        "date": date,
        "period": period,
        "site_id": site_id,
        "rows": rows,
        "totals": totals
    }


# ============================================================
# 2-1. GET /api/dashboard/attendance/workers - 현장별 출근자 명단
# ============================================================
@router.get("/attendance/workers")
async def attendance_workers(
    site_id: int = Query(..., description="Site ID (required)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY"),
    partner_id: Optional[int] = Query(None, description="Partner ID (optional, for filtering by company)")
) -> Dict[str, Any]:
    """
    현장별 출근자 명단 조회

    Returns:
    - site_name: 현장명
    - workers: 출근자 목록 (이름, 구분, 직종, 출근시간, 퇴근시간, 상태)
    """
    from backend.services.base_service import get_date_range
    start_date, end_date = get_date_range(date, period)

    # 현장명 조회
    site_query = "SELECT name FROM sites WHERE id = ?"
    site_result = execute_query(site_query, (site_id,))
    site_name = site_result[0]["name"] if site_result else "Unknown"

    # 출근자 명단 조회
    if partner_id:
        query = """
            SELECT
                a.work_date,
                a.worker_name,
                a.role,
                p.name as partner_name,
                a.birth_date,
                a.age,
                a.is_senior,
                a.check_in_time,
                a.check_out_time,
                a.has_accident
            FROM attendance_logs a
            JOIN partners p ON a.partner_id = p.id
            WHERE a.site_id = ?
              AND a.partner_id = ?
              AND a.work_date BETWEEN ? AND ?
            ORDER BY a.work_date DESC, a.role DESC, a.worker_name
        """
        workers = execute_query(query, (site_id, partner_id, start_date.isoformat(), end_date.isoformat()))
    else:
        query = """
            SELECT
                a.work_date,
                a.worker_name,
                a.role,
                p.name as partner_name,
                a.birth_date,
                a.age,
                a.is_senior,
                a.check_in_time,
                a.check_out_time,
                a.has_accident
            FROM attendance_logs a
            JOIN partners p ON a.partner_id = p.id
            WHERE a.site_id = ?
              AND a.work_date BETWEEN ? AND ?
            ORDER BY a.work_date DESC, a.role DESC, a.worker_name
        """
        workers = execute_query(query, (site_id, start_date.isoformat(), end_date.isoformat()))

    return {
        "site_id": site_id,
        "site_name": site_name,
        "date": date,
        "period": period,
        "total_count": len(workers),
        "workers": workers
    }


# ============================================================
# 3. GET /api/dashboard/tbm - TBM 현황 데이터 (PRD 4.1 로직)
# ============================================================
@router.get("/tbm")
async def dashboard_tbm(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
):
    """
    TBM 현황 데이터 조회 (PRD 4.1 로직)

    TBM 참여율 = (tbm_participants 수 / attendance_logs 수) * 100

    Returns:
    - summary: 참여 업체 수, 작성된 TBM 문서 수, TBM 참석 근로자 수, 참여율 (%)
    - rows: 현장별/소속별 TBM 데이터
    """
    return get_tbm_summary(site_id, date, period)


# ============================================================
# 4. GET /api/dashboard/risk - 위험성평가 데이터
# ============================================================
@router.get("/risk")
async def dashboard_risk(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
):
    """
    위험성평가 데이터 조회

    Returns:
    - summary: 참여 업체 수, 위험성평가 문서 수, 위험요인 수, 조치결과 수
    - rows: 현장별/소속별 위험성평가 데이터
    """
    return get_risk_summary(site_id, date, period)


# ============================================================
# 5. GET /api/dashboard/seniors - 고령자 통계 (PRD Step 2)
# ============================================================
@router.get("/seniors", response_model=List[SeniorWorker])
async def senior_workers(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format")
):
    """
    고령자 통계 조회 (is_senior=1 인 근로자 목록)
    """
    return get_senior_workers(site_id, date)


@router.get("/seniors/stats")
async def senior_statistics(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
) -> Dict[str, Any]:
    """
    현장별 고령자(is_senior=1) 수 집계 (PRD 4.1 Step 2)
    """
    from backend.services.base_service import get_date_range
    start_date, end_date = get_date_range(date, period)

    if site_id:
        query = """
            SELECT
                p.id as partner_id,
                p.name as partner_name,
                SUM(CASE WHEN a.is_senior = 1 AND a.role = '관리자' THEN 1 ELSE 0 END) as senior_managers,
                SUM(CASE WHEN a.is_senior = 1 AND a.role = '근로자' THEN 1 ELSE 0 END) as senior_workers,
                SUM(CASE WHEN a.is_senior = 1 THEN 1 ELSE 0 END) as senior_total,
                COUNT(*) as total_workers
            FROM attendance_logs a
            JOIN partners p ON a.partner_id = p.id
            WHERE a.site_id = ?
              AND a.work_date BETWEEN ? AND ?
            GROUP BY p.id
            ORDER BY senior_total DESC
        """
        rows = execute_query(query, (site_id, start_date.isoformat(), end_date.isoformat()))
    else:
        query = """
            SELECT
                s.id as site_id,
                s.name as site_name,
                SUM(CASE WHEN a.is_senior = 1 AND a.role = '관리자' THEN 1 ELSE 0 END) as senior_managers,
                SUM(CASE WHEN a.is_senior = 1 AND a.role = '근로자' THEN 1 ELSE 0 END) as senior_workers,
                SUM(CASE WHEN a.is_senior = 1 THEN 1 ELSE 0 END) as senior_total,
                COUNT(*) as total_workers
            FROM attendance_logs a
            JOIN sites s ON a.site_id = s.id
            WHERE a.work_date BETWEEN ? AND ?
            GROUP BY s.id
            ORDER BY senior_total DESC
        """
        rows = execute_query(query, (start_date.isoformat(), end_date.isoformat()))

    # 전체 합계
    totals = {
        "senior_managers": sum(r["senior_managers"] or 0 for r in rows),
        "senior_workers": sum(r["senior_workers"] or 0 for r in rows),
        "senior_total": sum(r["senior_total"] or 0 for r in rows),
        "total_workers": sum(r["total_workers"] for r in rows),
    }
    totals["senior_rate"] = round(
        (totals["senior_total"] / totals["total_workers"] * 100) if totals["total_workers"] > 0 else 0, 1
    )

    return {
        "date": date,
        "period": period,
        "site_id": site_id,
        "rows": rows,
        "totals": totals
    }


# ============================================================
# 6. GET /api/dashboard/accidents - 사고 현황
# ============================================================
@router.get("/accidents", response_model=List[Accident])
async def accidents(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
):
    """
    사고 현황 조회
    """
    return get_accidents(site_id, date, period)
