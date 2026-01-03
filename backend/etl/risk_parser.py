"""
Parser for risk assessment Excel files (위험성평가)
Directory: data_repository/02_risk_assessment/
Pattern: 위험성평가_(Company Project)_(Contractor)_YYMMDD_YYMMDD_0.xlsx

Two types of risk assessments:
1. 최초 위험성 평가표 - Initial risk assessment (no worker confirmations)
2. 수시 위험성 평가표 - Ad-hoc risk assessment (has worker confirmations)
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


class RiskAssessmentParser(BaseExcelParser):
    """Parser for risk assessment Excel files."""

    SHEET_NAME = "위험성"  # Will match both 최초 and 수시
    METADATA_ROWS = 6
    DATA_START_ROW = 7

    def parse_filename(self) -> Dict[str, Any]:
        """
        Parse filename to extract metadata.
        Pattern: 위험성평가_(Company Project)_(Contractor)_YYMMDD_YYMMDD_0.xlsx
        """
        basename = self.file_path.stem

        # Remove the prefix
        name = basename.replace("위험성평가_", "")

        # Split by underscore
        parts = name.split("_")

        # Extract from end: index, end_date, start_date
        doc_index = 0
        start_date = None
        end_date = None
        partner_name = ""
        site_name = ""

        if len(parts) >= 4:
            try:
                doc_index = int(parts[-1])
            except ValueError:
                doc_index = 0

            end_date = parse_yymmdd(parts[-2])
            start_date = parse_yymmdd(parts[-3])
            partner_name = normalize_text(parts[-4]) if len(parts) >= 4 else ""
            site_name = normalize_text(parts[0]) if parts else ""

        return {
            "start_date": start_date,
            "end_date": end_date,
            "doc_index": doc_index,
            "site_name": site_name,
            "partner_name": partner_name,
            "raw_filename": basename
        }

    def _determine_risk_type(self) -> str:
        """Determine risk type from sheet name.

        Types:
        - 최초: Initial risk assessment (default)
        - 수시: Ad-hoc risk assessment
        - 정기: Regular/periodic risk assessment
        """
        if self.worksheet is None:
            return "최초"

        sheet_name = self.worksheet.title
        if "수시" in sheet_name:
            return "수시"
        if "정기" in sheet_name:
            return "정기"
        return "최초"

    def extract_metadata(self) -> Dict[str, Any]:
        """Extract metadata from header rows."""
        risk_type = self._determine_risk_type()
        return {"risk_type": risk_type}

    def _find_data_rows(self) -> tuple:
        """Find the start and end of data section."""
        start_row = None
        end_row = None

        # Find header row with "NO" or similar (handle "N O" with space)
        for row in range(1, min(15, self.worksheet.max_row + 1)):
            for col in range(1, min(5, self.worksheet.max_column + 1)):
                value = self.get_cell_value(row, col)
                if value and isinstance(value, str):
                    text = value.strip().upper().replace("\n", "").replace(" ", "")
                    if text in ("NO", "NO.", "번호"):
                        start_row = row + 1
                        break
            if start_row:
                break

        if not start_row:
            start_row = self.DATA_START_ROW

        # Find end of data (before 추가 위험 요인, 조치 결과, 아차사고 section)
        end_row = self.worksheet.max_row
        for row in range(start_row, self.worksheet.max_row + 1):
            # Check first few columns for section markers
            for col in range(1, min(10, self.worksheet.max_column + 1)):
                val = self.get_cell_value(row, col)
                if val and isinstance(val, str):
                    text = val.replace(" ", "").strip()
                    # 데이터 영역 종료 마커들
                    if any(marker in text for marker in ["추가", "조치", "위험성평가", "아차사고"]):
                        end_row = row - 1
                        return start_row, end_row

        return start_row, end_row

    def _find_risk_factor_column(self) -> int:
        """Find the column containing risk factors."""
        for row in range(1, min(10, self.worksheet.max_row + 1)):
            for col in range(1, min(20, self.worksheet.max_column + 1)):
                value = self.get_cell_value(row, col)
                if value and isinstance(value, str):
                    text = value.strip()
                    if "위험요인" in text or "위험 요인" in text:
                        return col
        return 8  # Default for 수시

    def _find_measure_column(self) -> int:
        """Find the column containing improvement measures (개선대책)."""
        for row in range(1, min(10, self.worksheet.max_row + 1)):
            for col in range(1, min(50, self.worksheet.max_column + 1)):
                value = self.get_cell_value(row, col)
                if value and isinstance(value, str):
                    text = value.strip()
                    if "개선대책" in text or "개선 대책" in text:
                        return col
        return 25  # Default for 수시 type

    def extract_data_rows(self) -> List[Dict[str, Any]]:
        """Extract risk assessment items from the worksheet."""
        records = []

        start_row, end_row = self._find_data_rows()
        risk_col = self._find_risk_factor_column()
        measure_col = self._find_measure_column()

        # 무효 마커 - 이 텍스트가 포함된 경우 레코드로 처리하지 않음
        invalid_markers = ["아차사고", "추가위험", "조치결과", "이행확인", "위험성평가"]

        for row in range(start_row, end_row + 1):
            # 위험요인 컬럼에 내용이 있으면 레코드로 추가
            # (NO 컬럼 유무와 관계없이 - 대분류 아래 서브행도 포함)
            risk_factor = clean_cell_value(self.get_cell_value(row, risk_col))
            measure = clean_cell_value(self.get_cell_value(row, measure_col))

            # 무효 마커가 포함된 경우 건너뛰기
            risk_text = (risk_factor or "").replace(" ", "")
            measure_text = (measure or "").replace(" ", "")
            if any(marker in risk_text or marker in measure_text for marker in invalid_markers):
                continue

            # 위험요인과 개선대책 둘 다 있는 행만 유효한 레코드로 포함
            if risk_factor and measure:
                records.append({
                    "risk_factor": risk_factor,
                    "measure": measure  # 개선대책
                })

        return records

    def extract_action_results(self) -> List[Dict[str, Any]]:
        """Extract action results from 조치결과 section (수시/정기 only).

        조치결과 섹션은 시트 하단에 위치 (위치는 데이터 길이에 따라 변동):
        - "조 치 결 과 (위 험 성 평 가 이 행 확 인)" 헤더
        - "1번 조치결과", "2번 조치결과" 등의 라벨 (같은 셀에 여러 개 있을 수 있음)
        - 실제 조치결과 데이터 (등록일, 등록자, 내용)
        """
        action_results = []

        risk_type = self._determine_risk_type()
        if risk_type == "최초":
            return action_results

        # Find "조치결과" or "이행확인" section header (위치는 가변적)
        action_section_row = None
        for row in range(1, self.worksheet.max_row + 1):
            val = self.get_cell_value(row, 1)
            if val and isinstance(val, str):
                text = val.replace(" ", "")
                if "조치결과" in text and "이행" in text:
                    action_section_row = row
                    break

        if not action_section_row:
            return action_results

        # Find rows with "N번 조치결과" labels and count actual data
        for row in range(action_section_row, min(action_section_row + 10, self.worksheet.max_row + 1)):
            # Check all columns for action result labels
            for col in range(1, 50):
                val = self.get_cell_value(row, col)
                if val and isinstance(val, str) and "조치결과" in val and "번" in val:
                    # This cell has action result labels (e.g., "1번 조치결과" or "1번 조치결과\n2번 조치결과")
                    # Check next rows for actual data entries
                    for data_row in range(row + 1, min(row + 10, self.worksheet.max_row + 1)):
                        # Scan all columns for actual data (등록일, 내용 등)
                        for data_col in range(1, 50):
                            data_val = self.get_cell_value(data_row, data_col)
                            if data_val and isinstance(data_val, str):
                                # 등록일이 포함된 데이터만 조치결과로 카운트
                                if "등록일" in data_val:
                                    action_results.append({
                                        "row": data_row,
                                        "col": data_col,
                                        "content": clean_cell_value(data_val)
                                    })
                    return action_results  # Found action section, return results

        return action_results

    def extract_confirmations(self) -> List[Dict[str, Any]]:
        """Extract worker confirmations (only for 수시 type)."""
        confirmations = []

        if self._determine_risk_type() != "수시":
            return confirmations

        # Find "위험성평가 근로자 확인" section
        confirm_start = None
        for row in range(1, self.worksheet.max_row + 1):
            val = self.get_cell_value(row, 1)
            if val and isinstance(val, str) and "위험성평가" in val and "확인" in val:
                confirm_start = row + 1  # Skip header row
                break

        if not confirm_start:
            return confirmations

        # Skip the column header row (직종, 이름, 서명...)
        confirm_start += 1

        # Parse confirmation rows - workers repeat every 12 columns
        # Column structure: C1=직종, C5=이름, C9=서명, C13=직종, C17=이름, C21=서명, ...
        # Pattern: position at col N, name at col N+4, for N = 1, 13, 25, 37, 49...
        for row in range(confirm_start, self.worksheet.max_row + 1):
            # Scan all worker column groups (up to column 60 to cover many workers)
            for base_col in range(1, 61, 12):  # 1, 13, 25, 37, 49
                pos_col = base_col
                name_col = base_col + 4

                position = clean_cell_value(self.get_cell_value(row, pos_col))
                worker_name = clean_cell_value(self.get_cell_value(row, name_col))

                if worker_name and not any(kw in worker_name for kw in ["직종", "이름", "서명"]):
                    confirmations.append({
                        "worker_name": worker_name.strip(),
                        "position": position.strip() if position else None
                    })

        return confirmations

    def run(self) -> Dict[str, Any]:
        """Override run to include confirmations and action results."""
        try:
            self.open_workbook()
            self.worksheet = self.get_sheet()

            file_meta = self.parse_filename()
            sheet_meta = self.extract_metadata()
            metadata = {**file_meta, **sheet_meta}

            records = self.extract_data_rows()
            confirmations = self.extract_confirmations()
            action_results = self.extract_action_results()

            return {
                "filename": self.file_path.name,
                "metadata": metadata,
                "records": records,  # 위험요인 + 개선대책 (measure)
                "confirmations": confirmations,  # 근로자 확인
                "action_results": action_results  # 조치이행결과
            }
        finally:
            self.close_workbook()


def parse_risk_file(file_path: str) -> Dict[str, Any]:
    """Convenience function to parse a risk assessment file."""
    parser = RiskAssessmentParser(file_path)
    return parser.run()
