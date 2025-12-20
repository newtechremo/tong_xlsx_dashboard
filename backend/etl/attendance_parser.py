"""
Parser for attendance Excel files (출퇴근무사고)
Directory: data_repository/01_attendance/
Pattern: 출퇴근무사고_(Site Name)_(Partner Name)_YYMMDD.xlsx

New Excel Structure (as of 2025-12):
- Sheet name: "출퇴근 무사고 확인서"
- Header row: 14
- Columns:
  - Col 2: NO
  - Col 3: 구분 (관리자/근로자)
  - Col 5: 이름
  - Col 8: 직책∙직종
  - Col 11: 생년월일 (YY.MM.DD format)
  - Col 14: 휴대폰 번호
  - Col 17: 출근 시간 (HH:MM:SS)
  - Col 20: 퇴근 시간 (HH:MM:SS or '-')
  - Col 23: 상태 (무사고/사고)
"""

import re
from datetime import date, time
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base_parser import BaseExcelParser
from .utils import (
    parse_yymmdd,
    parse_birth_date,
    parse_time,
    calculate_age,
    is_senior,
    normalize_text,
    clean_cell_value
)


class AttendanceParser(BaseExcelParser):
    """Parser for attendance Excel files."""

    SHEET_NAME = "출퇴근 무사고 확인서"
    HEADER_ROW = 14
    DATA_START_ROW = 15

    # Fixed column indices for new Excel structure
    COL_NO = 2
    COL_ROLE = 3          # 구분: 관리자/근로자
    COL_NAME = 5          # 이름
    COL_POSITION = 8      # 직책∙직종
    COL_BIRTH = 11        # 생년월일
    COL_PHONE = 14        # 휴대폰 번호
    COL_CHECK_IN = 17     # 출근 시간
    COL_CHECK_OUT = 20    # 퇴근 시간
    COL_STATUS = 23       # 상태 (무사고/사고)

    def parse_filename(self) -> Dict[str, Any]:
        """
        Parse filename to extract metadata.
        Pattern: 출퇴근무사고_(주)삼천리이에스 안양아삼파워 연료전지 발전사업_(주)삼천리이에스_250227.xlsx
        """
        basename = self.file_path.stem  # Without extension

        # Remove the prefix
        name = basename.replace("출퇴근무사고_", "")

        # Split by underscore
        parts = name.split("_")

        # Last part is the date (YYMMDD)
        date_str = parts[-1] if parts else ""
        work_date = parse_yymmdd(date_str)

        # Partner/organization is the second-to-last part
        partner_name = normalize_text(parts[-2]) if len(parts) >= 2 else ""

        # Site/project info is the first part (may contain company and project)
        # Keep the full site name including company prefix
        site_name = normalize_text(parts[0]) if parts else ""

        return {
            "work_date": work_date,
            "site_name": site_name,
            "partner_name": partner_name
        }

    def extract_metadata(self) -> Dict[str, Any]:
        """Extract metadata from header rows."""
        return {}

    def _parse_time_value(self, value) -> Optional[time]:
        """Parse time value from various formats."""
        if value is None:
            return None

        value_str = str(value).strip()

        # Handle empty or dash values
        if not value_str or value_str == '-':
            return None

        # Try HH:MM:SS format
        try:
            parts = value_str.split(':')
            if len(parts) == 3:
                h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
                return time(h, m, s)
            elif len(parts) == 2:
                h, m = int(parts[0]), int(parts[1])
                return time(h, m, 0)
        except (ValueError, TypeError):
            pass

        # Fallback to utility function
        return parse_time(value)

    def _find_data_section_end(self, start_row: int) -> int:
        """Find where the data section ends (before 사고발생자 명단)."""
        for row in range(start_row, self.worksheet.max_row + 1):
            # Check column 2 for section markers
            val = self.get_cell_value(row, 2)
            if val:
                val_str = str(val).strip()
                if '사고발생자' in val_str or '명단' in val_str:
                    return row - 1
        return self.worksheet.max_row

    def extract_data_rows(self) -> List[Dict[str, Any]]:
        """Extract attendance data from the worksheet."""
        records = []

        # Get filename metadata for work_date
        file_meta = self.parse_filename()
        work_date = file_meta.get("work_date")

        # Find the end of the data section
        data_end_row = self._find_data_section_end(self.DATA_START_ROW)

        for row in range(self.DATA_START_ROW, data_end_row + 1):
            # Get NO - skip if empty (means end of data)
            no_val = self.get_cell_value(row, self.COL_NO)
            if not no_val or not str(no_val).strip() or not str(no_val).strip().isdigit():
                continue

            # Get name - skip empty rows
            worker_name = clean_cell_value(self.get_cell_value(row, self.COL_NAME))
            if not worker_name:
                continue

            # Skip if it looks like a header or total row
            if any(keyword in worker_name for keyword in ["합계", "총계", "성명", "이름", "NO"]):
                continue

            # Extract role (구분)
            role_value = clean_cell_value(self.get_cell_value(row, self.COL_ROLE))
            role = "근로자"  # Default
            if role_value:
                if "관리" in role_value:
                    role = "관리자"

            # Extract birth date (YY.MM.DD format)
            birth_value = self.get_cell_value(row, self.COL_BIRTH)
            birth_date = parse_birth_date(birth_value)

            # Calculate age and senior status
            age = None
            senior = False
            if birth_date and work_date:
                age = calculate_age(birth_date, work_date)
                senior = is_senior(birth_date, work_date)

            # Extract check-in time
            check_in = self._parse_time_value(self.get_cell_value(row, self.COL_CHECK_IN))

            # Extract check-out time
            check_out = self._parse_time_value(self.get_cell_value(row, self.COL_CHECK_OUT))

            # Extract accident status from 상태 column
            status_value = clean_cell_value(self.get_cell_value(row, self.COL_STATUS))
            has_accident = False
            if status_value:
                status_str = status_value.lower()
                # "무사고" means no accident, anything else (like "사고") means accident
                has_accident = '사고' in status_str and '무사고' not in status_str

            record = {
                "worker_name": worker_name,
                "role": role,
                "birth_date": birth_date.isoformat() if birth_date else None,
                "age": age,
                "is_senior": senior,
                "check_in_time": check_in.isoformat() if check_in else None,
                "check_out_time": check_out.isoformat() if check_out else None,
                "has_accident": has_accident
            }
            records.append(record)

        return records


def parse_attendance_file(file_path: str) -> Dict[str, Any]:
    """Convenience function to parse an attendance file."""
    parser = AttendanceParser(file_path)
    return parser.run()
