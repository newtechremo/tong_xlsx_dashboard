"""
Parser for TBM (Tool Box Meeting) Excel files
Directory: data_repository/03_tbm/
Pattern: tbm_(Company Project)_(Contractor)_YYMMDD.xlsx
"""

import re
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base_parser import BaseExcelParser
from .utils import (
    parse_yymmdd,
    normalize_text,
    clean_cell_value
)


class TbmParser(BaseExcelParser):
    """Parser for TBM Excel files."""

    SHEET_NAME = "TBM"  # Will match "TBM 활동일지" etc.
    METADATA_ROWS = 12
    DATA_START_ROW = 14

    def parse_filename(self) -> Dict[str, Any]:
        """
        Parse filename to extract metadata.
        Pattern: tbm_(Company Project)_(Contractor)_YYMMDD.xlsx
        Example: tbm_(주)삼천리이에스 삼천리 수원사옥_(주)삼천리이에스_250227.xlsx
        """
        basename = self.file_path.stem  # Without extension

        # Remove the prefix (case-insensitive)
        name = re.sub(r'^tbm_', '', basename, flags=re.IGNORECASE)

        # Split by underscore
        parts = name.split("_")

        # Last part is the date (YYMMDD)
        date_str = parts[-1] if parts else ""
        work_date = parse_yymmdd(date_str)

        # Partner/contractor is the second-to-last part
        partner_name = normalize_text(parts[-2]) if len(parts) >= 2 else ""

        # Site/project info is the first part - keep full name
        site_name = normalize_text(parts[0]) if parts else ""

        return {
            "work_date": work_date,
            "site_name": site_name,
            "partner_name": partner_name
        }

    def extract_metadata(self) -> Dict[str, Any]:
        """Extract metadata from header rows."""
        content = ""

        # Look for "작업내용" label and get its value
        for row in range(1, min(12, self.worksheet.max_row + 1)):
            for col in range(1, min(10, self.worksheet.max_column + 1)):
                value = self.get_cell_value(row, col)
                if value and isinstance(value, str):
                    text = value.strip()
                    if "작업내용" in text:
                        # Get the content from column 6 (typical layout)
                        content_value = self.get_cell_value(row, 6)
                        if content_value:
                            content = str(content_value).strip()
                            break
            if content:
                break

        # If no content found, try to get 위험요인
        if not content:
            for row in range(1, min(12, self.worksheet.max_row + 1)):
                value = self.get_cell_value(row, 1)
                if value and isinstance(value, str) and "위험요인" in value:
                    # Get next row's content
                    next_value = self.get_cell_value(row + 1, 1)
                    if next_value:
                        content = str(next_value).strip()
                    break

        return {"content": content}

    def _find_participant_header(self) -> tuple:
        """Find the header row and all name columns."""
        header_row = None
        name_columns = []

        # Scan for all "이름" columns in the header area
        for row in range(1, min(20, self.worksheet.max_row + 1)):
            for col in range(1, min(50, self.worksheet.max_column + 1)):
                value = self.get_cell_value(row, col)
                if value and isinstance(value, str):
                    text = value.strip()
                    if text == "이름" or text == "성명":
                        if header_row is None:
                            header_row = row
                        if row == header_row:
                            name_columns.append(col)

        if header_row and name_columns:
            return header_row, name_columns

        # Fallback: look for "참석자 명단" and assume structure
        for row in range(1, min(20, self.worksheet.max_row + 1)):
            value = self.get_cell_value(row, 1)
            if value and isinstance(value, str) and "참석자" in value:
                # Header row is next row, name columns at 11 and 35
                return row + 1, [11, 35]

        return self.DATA_START_ROW - 1, [11, 35]

    def extract_data_rows(self) -> List[Dict[str, Any]]:
        """Extract TBM participant data from the worksheet."""
        participants = []

        header_row, name_columns = self._find_participant_header()
        data_start = header_row + 1

        for row in range(data_start, self.worksheet.max_row + 1):
            # Check each name column (supports multi-column layout)
            for name_col in name_columns:
                worker_name = clean_cell_value(self.get_cell_value(row, name_col))

                if not worker_name:
                    continue

                # Skip header-like values
                if any(keyword in worker_name for keyword in ["이름", "성명", "참석", "합계", "총", "직종"]):
                    continue

                # Skip numbers only
                if worker_name.replace(" ", "").isdigit():
                    continue

                # Skip if too short (likely not a name)
                if len(worker_name.strip()) < 2:
                    continue

                participants.append({
                    "worker_name": worker_name.strip()
                })

        return participants


def parse_tbm_file(file_path: str) -> Dict[str, Any]:
    """Convenience function to parse a TBM file."""
    parser = TbmParser(file_path)
    return parser.run()
