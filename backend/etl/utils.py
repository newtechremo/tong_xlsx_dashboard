"""
ETL utility functions for date parsing and text normalization
"""

import re
from datetime import date, datetime, time
from typing import Optional, Union


def parse_yymmdd(date_str: str) -> Optional[date]:
    """Parse YYMMDD format to date object."""
    if not date_str or len(date_str) != 6:
        return None
    try:
        yy = int(date_str[:2])
        mm = int(date_str[2:4])
        dd = int(date_str[4:6])
        # Assume 20XX for years
        year = 2000 + yy
        return date(year, mm, dd)
    except (ValueError, TypeError):
        return None


def parse_date(value: Union[str, datetime, date, None]) -> Optional[date]:
    """Parse various date formats to date object."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        value = value.strip()
        # Try YYYY-MM-DD
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            pass
        # Try YYYY.MM.DD
        try:
            return datetime.strptime(value, "%Y.%m.%d").date()
        except ValueError:
            pass
        # Try YYMMDD
        result = parse_yymmdd(value)
        if result:
            return result
    return None


def parse_time(value: Union[str, datetime, time, None]) -> Optional[time]:
    """Parse time value to time object."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.time()
    if isinstance(value, time):
        return value
    if isinstance(value, str):
        value = value.strip()
        # Try HH:MM:SS
        try:
            return datetime.strptime(value, "%H:%M:%S").time()
        except ValueError:
            pass
        # Try HH:MM
        try:
            return datetime.strptime(value, "%H:%M").time()
        except ValueError:
            pass
    return None


def parse_birth_date(value: Union[str, datetime, date, int, None]) -> Optional[date]:
    """Parse birth date from various formats (including Excel serial numbers)."""
    if value is None:
        return None

    # Handle Excel serial date number
    if isinstance(value, (int, float)):
        try:
            # Excel date serial: days since 1899-12-30
            from datetime import timedelta
            excel_epoch = date(1899, 12, 30)
            return excel_epoch + timedelta(days=int(value))
        except (ValueError, OverflowError):
            return None

    # Handle YY.MM.DD format (e.g., "69.07.18")
    if isinstance(value, str):
        value = value.strip()
        match = re.match(r'^(\d{2})\.(\d{2})\.(\d{2})$', value)
        if match:
            try:
                yy = int(match.group(1))
                mm = int(match.group(2))
                dd = int(match.group(3))
                # Determine century: 00-30 -> 2000s, 31-99 -> 1900s
                year = 2000 + yy if yy <= 30 else 1900 + yy
                return date(year, mm, dd)
            except (ValueError, TypeError):
                pass

    return parse_date(value)


def calculate_age(birth_date: date, reference_date: Optional[date] = None) -> int:
    """Calculate age from birth date."""
    if reference_date is None:
        reference_date = date.today()

    age = reference_date.year - birth_date.year
    # Adjust if birthday hasn't occurred yet this year
    if (reference_date.month, reference_date.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age


def is_senior(birth_date: date, reference_date: Optional[date] = None, threshold: int = 65) -> bool:
    """Check if person is senior (65+ by default)."""
    age = calculate_age(birth_date, reference_date)
    return age >= threshold


def normalize_text(text: Optional[str]) -> str:
    """Normalize Korean/mixed text by removing extra whitespace."""
    if text is None:
        return ""
    # Convert to string and strip
    text = str(text).strip()
    # Replace multiple spaces with single space
    text = re.sub(r'\s+', ' ', text)
    return text


def extract_site_name(filename: str) -> str:
    """Extract site name from filename pattern."""
    # Pattern: 출퇴근무사고_(주)삼천리이에스 안양아삼파워 연료전지 발전사업_(주)삼천리이에스_250227.xlsx
    # Site name is the second part after first underscore, before the company name
    parts = filename.split('_')
    if len(parts) >= 3:
        # The site/project is in the second part
        site_part = parts[1].strip()
        # Try to extract just the project name (after company name if present)
        if ' ' in site_part:
            # Split by company name pattern like (주)
            company_match = re.search(r'\(주\)[^\s]+\s+(.+)', site_part)
            if company_match:
                return company_match.group(1).strip()
        return site_part
    return ""


def extract_partner_name(filename: str) -> str:
    """Extract partner/organization name from filename pattern."""
    parts = filename.split('_')
    if len(parts) >= 4:
        # Partner name is typically the third or last part before date
        return normalize_text(parts[-2])
    return ""


def clean_cell_value(value) -> Optional[str]:
    """Clean cell value, returning None for empty/whitespace-only values."""
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in ('none', 'nan', 'null', ''):
        return None
    return text
