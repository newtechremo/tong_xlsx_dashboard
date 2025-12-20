"""
TBM (Tool Box Meeting) API routes
"""

from typing import List, Optional
from fastapi import APIRouter, Query

from backend.api.schemas.tbm import (
    TbmSummaryResponse,
    TbmLog,
    TbmParticipant
)
from backend.services.tbm_service import (
    get_tbm_summary,
    get_tbm_logs,
    get_tbm_participants
)

router = APIRouter()


@router.get("/summary", response_model=TbmSummaryResponse)
async def tbm_summary(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY")
):
    """
    Get TBM summary with KPIs and breakdown table.

    Returns:
    - Participating companies
    - Written TBM documents
    - Total TBM attendees
    - Participation rate
    """
    return get_tbm_summary(site_id, date, period)


@router.get("/logs", response_model=List[TbmLog])
async def tbm_logs(
    site_id: Optional[int] = Query(None, description="Site ID (null for all sites)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format")
):
    """
    Get list of TBM logs for a specific date.
    """
    return get_tbm_logs(site_id, date)


@router.get("/participants/{tbm_id}", response_model=List[TbmParticipant])
async def tbm_participants(tbm_id: int):
    """
    Get participants for a specific TBM log.
    """
    return get_tbm_participants(tbm_id)
