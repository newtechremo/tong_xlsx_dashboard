"""
Risk Assessment API routes
"""

from typing import List, Optional
from fastapi import APIRouter, Query

from backend.api.schemas.risk import (
    RiskSummaryResponse,
    RiskDocument,
    RiskItem,
    RiskDailyResponse,
    RiskAllSitesResponse
)
from backend.services.risk_service import (
    get_risk_summary,
    get_risk_documents,
    get_risk_items,
    get_risk_daily_summary,
    get_risk_all_sites_summary
)

router = APIRouter()


@router.get("/summary", response_model=RiskSummaryResponse)
async def risk_summary(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
):
    """
    Get risk assessment summary with KPIs and breakdown table.

    Returns:
    - Participating companies
    - Active documents
    - Risk factors count
    - Action results count
    """
    return get_risk_summary(site_id, date, period)


@router.get("/documents", response_model=List[RiskDocument])
async def risk_documents(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
):
    """
    Get list of risk assessment documents within the period.
    """
    return get_risk_documents(site_id, date, period)


@router.get("/items/{doc_id}", response_model=List[RiskItem])
async def risk_items(doc_id: int):
    """
    Get risk items for a specific document.
    """
    return get_risk_items(doc_id)


@router.get("/daily", response_model=RiskDailyResponse)
async def risk_daily(
    site_id: int = Query(..., description="Site ID (required)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
):
    """
    위험성평가 통계 (일간/주간/월간 지원).
    협력사별로 문서 타입(최초/수시/정기)별 통계를 반환.

    Returns:
    - 참여업체별 문서 타입 통계
    - 최초/수시/정기 각각의 문서 수, 위험요인, 개선대책, 조치결과(이행), 확인근로자
    - 수시 문서 기준 차트 데이터
    - KPI 추가위험요인: 수시 문서의 위험요인만 집계
    """
    return get_risk_daily_summary(site_id, date, period)


@router.get("/all-sites", response_model=RiskAllSitesResponse)
async def risk_all_sites(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
):
    """
    전체 현장 위험성평가 통계 (일간/주간/월간 지원).
    현장별 → 협력사별 → 문서 타입별 통계를 반환.

    Returns:
    - 현장별 통계 (하위에 협력사별, 문서타입별 통계 포함)
    - 수시 문서 기준 차트 데이터
    - KPI 추가위험요인: 수시 문서의 위험요인만 집계
    """
    return get_risk_all_sites_summary(date, period)
