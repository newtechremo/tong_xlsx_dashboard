"""
Risk Assessment API routes
"""

from typing import List, Optional
from fastapi import APIRouter, Query

from backend.api.schemas.risk import (
    RiskSummaryResponse,
    RiskDocument,
    RiskItem
)
from backend.services.risk_service import (
    get_risk_summary,
    get_risk_documents,
    get_risk_items
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
