"""
Base service with common utilities
"""

from datetime import date, datetime, timedelta
from typing import Tuple


def get_date_range(date_str: str, period: str) -> Tuple[date, date]:
    """
    Calculate start and end dates based on period.

    Args:
        date_str: Date string in YYYY-MM-DD format
        period: DAILY, WEEKLY, or MONTHLY

    Returns:
        Tuple of (start_date, end_date)
    """
    target = datetime.strptime(date_str, "%Y-%m-%d").date()

    if period == "DAILY":
        return target, target

    elif period == "WEEKLY":
        # Week starts on Monday
        start = target - timedelta(days=target.weekday())
        end = start + timedelta(days=6)
        return start, end

    else:  # MONTHLY
        start = target.replace(day=1)
        # Get last day of month
        if start.month == 12:
            next_month = start.replace(year=start.year + 1, month=1)
        else:
            next_month = start.replace(month=start.month + 1)
        end = next_month - timedelta(days=1)
        return start, end
