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
    action_result: Optional[str] = None
