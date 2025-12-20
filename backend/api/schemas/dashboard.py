"""
Dashboard Pydantic schemas
"""

from pydantic import BaseModel
from typing import List, Optional


class DashboardSummary(BaseModel):
    """KPI summary for dashboard."""
    total_workers: int = 0
    manager_count: int = 0
    field_worker_count: int = 0
    senior_total: int = 0
    senior_managers: int = 0
    senior_workers: int = 0
    checkout_count: int = 0
    checkout_rate: float = 0.0
    accident_count: int = 0


class SummaryRow(BaseModel):
    """Row in the summary table."""
    id: str
    label: str
    manager_count: int = 0
    worker_count: int = 0
    total_count: int = 0
    accident_count: int = 0
    senior_manager_count: int = 0
    senior_worker_count: int = 0
    total_senior_count: int = 0
    checkout_count: int = 0
    checkout_rate: float = 0.0


class DashboardResponse(BaseModel):
    """Full dashboard response."""
    summary: DashboardSummary
    rows: List[SummaryRow]


class SeniorWorker(BaseModel):
    """Senior worker detail."""
    id: int
    name: str
    age: int
    role: str
    partner: str
    site: str
    work_date: str


class Accident(BaseModel):
    """Accident record."""
    id: int
    worker_name: str
    role: str
    partner: str
    site: str
    work_date: str
