"""
Risk Assessment Pydantic schemas
"""

from pydantic import BaseModel
from typing import List, Optional


class RiskSummary(BaseModel):
    """KPI summary for risk assessment."""
    participating_companies: int = 0
    active_documents: int = 0
    risk_factors: int = 0
    action_results: int = 0


class RiskTableRow(BaseModel):
    """Row in the risk summary table."""
    id: str
    label: str
    comp_count: int = 0  # Only for all-sites view
    doc_count: int = 0
    risk_count: int = 0
    action_count: int = 0
    worker_count: int = 0


class RiskChartData(BaseModel):
    """Daily chart data for risk analytics."""
    date: str
    risk_count: int = 0
    action_count: int = 0


# ============ 새로운 문서 타입별 통계 스키마 ============

class RiskDocTypeStats(BaseModel):
    """Statistics for a specific document type (최초/수시/정기)."""
    doc_type: str  # 최초, 수시, 정기
    doc_count: int = 0  # 문서 건수
    risk_count: int = 0  # 위험요인 건수
    measure_count: int = 0  # 개선대책 건수 (최초/정기는 risk_count와 동일)
    action_count: int = 0  # 조치결과(이행) 건수 - 수시만 해당
    confirm_count: int = 0  # 확인근로자 수 - 수시만 해당


class RiskCompanyRow(BaseModel):
    """Company row with document type breakdown for daily view."""
    id: str  # partner_id
    label: str  # partner name
    doc_types: List[RiskDocTypeStats]  # 문서 타입별 통계
    # 합계
    total_doc_count: int = 0
    total_risk_count: int = 0
    total_measure_count: int = 0
    total_action_count: int = 0
    total_confirm_count: int = 0


class RiskSiteRow(BaseModel):
    """Site row with company breakdown for all-sites view."""
    id: str  # site_id
    label: str  # site name
    companies: List[RiskCompanyRow]  # 협력사별 통계
    # 현장 합계
    total_comp_count: int = 0
    total_doc_count: int = 0
    total_risk_count: int = 0
    total_measure_count: int = 0
    total_action_count: int = 0
    total_confirm_count: int = 0


class RiskDailyResponse(BaseModel):
    """일간/주간/월간 위험성평가 응답 (문서 타입별 통계 포함)."""
    summary: RiskSummary
    rows: List[RiskCompanyRow]
    chart_data: List[RiskChartData] = []  # 수시 문서 기준 차트 데이터


class RiskAllSitesResponse(BaseModel):
    """전체 현장용 위험성평가 응답 (현장→협력사→문서타입 구조)."""
    summary: RiskSummary
    rows: List[RiskSiteRow]
    chart_data: List[RiskChartData] = []  # 수시 문서 기준 차트 데이터


class RiskSummaryResponse(BaseModel):
    """Full risk summary response."""
    summary: RiskSummary
    rows: List[RiskTableRow]
    chart_data: List[RiskChartData] = []


class RiskDocument(BaseModel):
    """Risk document detail."""
    id: int
    site_name: str
    partner_name: str
    start_date: str
    end_date: str
    filename: Optional[str] = None
    item_count: int = 0


class RiskItem(BaseModel):
    """Risk item detail."""
    id: int
    risk_factor: Optional[str] = None
    measure: Optional[str] = None  # 개선대책
