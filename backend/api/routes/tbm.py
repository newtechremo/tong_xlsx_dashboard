"""
TBM (Tool Box Meeting) API routes
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query

from backend.api.schemas.tbm import (
    TbmSummaryResponse,
    TbmLog,
    TbmParticipant
)
from backend.services.tbm_service import (
    get_tbm_summary,
    get_tbm_logs,
    get_tbm_participants,
    get_tbm_unconfirmed
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


@router.get("/unconfirmed")
async def tbm_unconfirmed(
    site_id: int = Query(..., description="Site ID (required)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    period: str = Query("DAILY", description="Period: DAILY, WEEKLY, or MONTHLY"),
    partner_id: Optional[int] = Query(None, description="Partner ID (optional)")
) -> Dict[str, Any]:
    """
    🥚 Easter Egg: TBM 미확인자 조회

    출근했지만 TBM에 참석하지 않은 근로자 목록을 반환합니다.
    """
    return get_tbm_unconfirmed(site_id, date, period, partner_id)
