# 현장통 2.0 개발 진행 보고서

**작성일**: 2025-12-19
**상태**: 진행 중

---

## 1. 완료된 작업

### 1.1 백엔드 구조 (FastAPI + SQLite)

#### 폴더 구조
```
backend/
├── __init__.py
├── main.py                 # FastAPI 앱 엔트리포인트
├── config.py               # 설정 (DB 경로, CORS 등)
├── db.py                   # 간소화된 DB 접근 모듈 (PRD 요구사항)
├── requirements.txt        # Python 의존성
├── database/
│   ├── __init__.py
│   ├── connection.py       # DB 연결 유틸리티
│   └── schema.py           # SQLite 스키마 (7개 테이블)
├── etl/
│   ├── __init__.py
│   ├── base_parser.py      # 기본 Excel 파서 클래스
│   ├── attendance_parser.py # 출퇴근 파서 (1,120 파일)
│   ├── risk_parser.py      # 위험성평가 파서 (142 파일)
│   ├── tbm_parser.py       # TBM 파서 (648 파일)
│   ├── run_etl.py          # ETL 실행 스크립트
│   └── utils.py            # 날짜 파싱, 텍스트 정규화
├── api/
│   ├── routes/
│   │   ├── master.py       # /api/sites, /api/partners
│   │   ├── dashboard.py    # /api/dashboard/* (통합 엔드포인트)
│   │   ├── risk.py         # /api/risk/*
│   │   └── tbm.py          # /api/tbm/*
│   └── schemas/
│       ├── dashboard.py    # Pydantic 응답 모델
│       ├── risk.py
│       └── tbm.py
└── services/
    ├── base_service.py     # get_date_range() 등 공통 유틸
    ├── dashboard_service.py
    ├── risk_service.py
    └── tbm_service.py
```

#### 통합 API 엔드포인트 (`/api/dashboard/*`)
| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/dashboard/summary` | 전체 KPI 카드 데이터 |
| `GET /api/dashboard/attendance` | 출퇴근 현황 (현장별/소속별) |
| `GET /api/dashboard/tbm` | TBM 현황 + 참여율 |
| `GET /api/dashboard/risk` | 위험성평가 데이터 |
| `GET /api/dashboard/seniors` | 고령자 목록 |
| `GET /api/dashboard/seniors/stats` | 현장별 고령자 집계 |
| `GET /api/dashboard/accidents` | 사고 현황 |

#### 구현된 쿼리 (PRD Step 2)
1. **TBM 참여율**: `participation_rate = (tbm_attendees / attendance_count) * 100`
2. **고령자 통계**: 현장/소속별 고령 관리자, 고령 근로자 집계

### 1.2 프론트엔드 구조 (React 19 + TypeScript + Vite)

#### 생성/수정된 파일
```
source/
├── api/
│   ├── client.ts          # API 클라이언트 (fetchApi 래퍼)
│   └── types.ts           # TypeScript 응답 타입
├── hooks/
│   └── useApi.ts          # 커스텀 데이터 페칭 훅
├── components/
│   ├── LoadingSpinner.tsx # 로딩 컴포넌트
│   ├── ErrorMessage.tsx   # 에러 표시 컴포넌트
│   ├── DashboardView.tsx  # API 연동 완료 (USE_API 플래그)
│   ├── RiskAssessmentView.tsx # API 연동 완료
│   └── TbmMonitoringView.tsx  # API 연동 완료
└── docs/                  # 이 문서가 위치한 폴더
```

#### API 클라이언트 엔드포인트 매핑
- `riskApi.getSummary()` → `/dashboard/risk`
- `tbmApi.getSummary()` → `/dashboard/tbm`
- `dashboardApi.getSummary()` → `/dashboard/summary`

---

## 2. 발생한 이슈 및 해결

### 2.1 Import 충돌 문제
**문제**: `backend/database.py`와 `backend/database/` 디렉토리가 동시에 존재하여 import 오류 발생
```
ImportError: cannot import name 'execute_query' from 'backend.database'
```

**해결**: `database.py` → `db.py`로 파일명 변경
```python
# dashboard.py
from backend.db import execute_query  # 변경됨
```

### 2.2 Node.js PATH 문제
**문제**: Node.js 설치 후에도 bash에서 `npm` 명령어를 찾지 못함
```
npm: command not found
```

**원인**: Windows에 Node.js 설치했지만 Git Bash PATH에 자동 추가되지 않음

**해결 방법** (다음 세션에서 진행):
```bash
# 방법 1: 전체 경로 사용
"/c/Program Files/nodejs/npm.cmd" install

# 방법 2: PATH 추가
export PATH="/c/Program Files/nodejs:$PATH"
npm install
```

### 2.3 데이터베이스 비어있음 - "데이터를 불러오는데 실패했습니다" (2025-12-19)

**문제**: 프론트엔드 대시보드 접속 시 "데이터를 불러오는데 실패했습니다" 오류 발생

**원인**:
- ETL이 실행되지 않아 `safety.db` 파일에 테이블이 생성되지 않음
- API 호출 시 `Internal Server Error` 발생 (테이블 없음)

**확인 방법**:
```bash
# 데이터베이스 테이블 확인
python -c "import sqlite3; conn = sqlite3.connect('backend/database/safety.db'); c = conn.cursor(); c.execute('SELECT name FROM sqlite_master WHERE type=\"table\"'); print([r[0] for r in c.fetchall()])"
# 결과: [] (빈 리스트 = 테이블 없음)
```

**해결 방법**: ETL 실행
```bash
cd C:\claudetest\tong-headquarters\source
python -m backend.etl.run_etl
```

### 2.4 프론트엔드 포트 변경됨 (2025-12-19)

**문제**: 문서에 포트가 5173으로 기재되어 있지만 실제로는 3000번 포트로 실행됨

**원인**: Vite 설정(`vite.config.ts`)에서 포트가 3000번으로 설정됨

**수정**: 프론트엔드 접속 URL은 `http://localhost:3000` 입니다.

---

## 3. 다음 단계 (TODO)

### 3.1 프론트엔드 실행 (우선)
```bash
# 터미널에서 직접 실행 권장 (Git Bash 또는 PowerShell)
cd C:\claudetest\tong-headquarters\source
npm install
npm run dev
```

### 3.2 ETL 실행 (데이터베이스 구축)
```bash
cd C:\claudetest\tong-headquarters\source
python -m backend.etl.run_etl
```

### 3.3 Step 3: Frontend Dashboard 구현
- PRD 2.1항 레이아웃 (헤더, 사이드바, 컨트롤바)
- PRD 2.2~2.4항 KPI 카드
- Step 2 쿼리 결과 시각화 (Recharts 차트, 테이블)

---

## 4. 서버 실행 방법

### 백엔드 (FastAPI)
```bash
cd C:\claudetest\tong-headquarters\source
python -m uvicorn backend.main:app --reload --port 8000
```
- API 문서: http://127.0.0.1:8000/docs
- 헬스체크: http://127.0.0.1:8000/health

### 프론트엔드 (Vite)
```bash
cd C:\claudetest\tong-headquarters\source
npm run dev
```
- 기본 URL: http://localhost:3000

---

## 5. 데이터베이스 스키마 요약

```sql
-- 7개 테이블
sites           -- 현장 마스터
partners        -- 협력사 마스터
attendance_logs -- 출퇴근 기록 (is_senior, has_accident 포함)
risk_docs       -- 위험성평가 문서
risk_items      -- 위험성평가 항목
tbm_logs        -- TBM 활동일지
tbm_participants -- TBM 참석자
```

---

## 6. 참고 파일

- **계획서**: `.claude/plans/structured-toasting-owl.md`
- **프로젝트 문서**: `CLAUDE.md`
- **Mock 데이터**: `mockData.ts` (API 응답 구조 참고용)
