"""
Common Pydantic schemas
"""

from pydantic import BaseModel
from typing import Optional, List


class SiteResponse(BaseModel):
    id: int
    name: str


class PartnerResponse(BaseModel):
    id: int
    name: str


class DateRangeParams(BaseModel):
    """Common date range parameters."""
    site_id: Optional[int] = None
    date: str  # YYYY-MM-DD
    period: str = "DAILY"  # DAILY, WEEKLY, MONTHLY
