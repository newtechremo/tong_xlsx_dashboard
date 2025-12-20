"""
TBM Pydantic schemas
"""

from pydantic import BaseModel
from typing import List, Optional


class TbmSummary(BaseModel):
    """KPI summary for TBM."""
    participating_companies: int = 0
    written_tbm_docs: int = 0
    total_tbm_attendees: int = 0
    participation_rate: float = 0.0


class TbmTableRow(BaseModel):
    """Row in the TBM summary table."""
    id: str
    label: str
    comp_count: int = 0  # Only for all-sites view
    tbm_count: int = 0
    total_attendance: int = 0
    attendees: int = 0
    rate: float = 0.0


class TbmSummaryResponse(BaseModel):
    """Full TBM summary response."""
    summary: TbmSummary
    rows: List[TbmTableRow]


class TbmLog(BaseModel):
    """TBM log detail."""
    id: int
    work_date: str
    site_name: str
    partner_name: str
    content: Optional[str] = None
    participant_count: int = 0


class TbmParticipant(BaseModel):
    """TBM participant detail."""
    id: int
    worker_name: str
