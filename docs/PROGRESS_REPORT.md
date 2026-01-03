# 현장통 2.0 개발 진행 보고서

**작성일**: 2025-12-22 (최종 업데이트)
**상태**: 진행 중

---

## 0. 최근 작업 (2025-12-22)

### 0.0 프론트엔드 API 경로 및 Vite 설정 수정

#### API 경로 동적 결정 (`api/client.ts`)
**문제**: API_BASE가 `.env.local`에 하드코딩되어 있어서 다른 호스트로 접속 시 API 호출 실패

**수정 전**:
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

**수정 후**:
```typescript
const getApiBase = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8000/api`;
};
const API_BASE = getApiBase();
```

#### .env.local 수정
**문제**: `VITE_API_URL=http://172.20.231.119:8000/api` 하드코딩으로 동적 감지 무시됨

**해결**: VITE_API_URL 주석 처리하여 동적 감지 활성화

#### Vite allowedHosts 설정 (`vite.config.ts`)
**문제**: 외부 도메인 `con-admin.tongpeoples.com`으로 접속 시 차단됨

**해결**:
```typescript
server: {
  port: 3000,
  host: '0.0.0.0',
  allowedHosts: ['con-admin.tongpeoples.com', 'localhost', '127.0.0.1'],
},
```

---

### 0.1 전체 데이터 ETL 완료

#### 처리된 데이터 (전체 1,800+ 파일)
| 구분 | 파일 수 | 레코드 수 | 오류 |
|------|---------|-----------|------|
| 출퇴근 | 1,851 | 10,882 | 0 |
| 위험성평가 | 265 | 4,575 항목 / 993 확인 | 0 |
| TBM | 907 | 3,919 참가자 | 2 |

**총 소요시간**: 40분 31초

#### 데이터베이스 현황
| 테이블 | 레코드 수 |
|--------|----------|
| sites | 28 |
| partners | 21 |
| attendance_logs | 10,882 |
| risk_docs | 265 |
| tbm_logs | 907 |

#### 문서 타입별 현황
| 타입 | 문서 수 |
|------|---------|
| 수시 | 245 |
| 최초 | 19 |
| 정기 | 1 |

#### 주요 현장 (위험성평가 기준)
| 현장 | 수시 | 최초 | 정기 |
|------|------|------|------|
| 안양아삼파워 연료전지 발전사업 | 137 | - | 1 |
| 서울교통공사도봉차량기지 | 42 | - | - |
| BMW 청주서비스센터 | 10 | 1 | - |

#### 오류 파일 (2개 - 작업일자 누락)
1. `tbm_...안양아삼파워...삼천리ENG_250614_1.xlsx`
2. `tbm_향남연료전지...삼천리이에스_250411_1.xlsx`

---

## 0-1. 이전 작업 (2025-12-21)

### 0.1 위험성평가 문서타입별 통계 기능 구현

#### 요구사항
- 위험성평가 문서를 3가지 타입으로 분류: **최초**, **수시**, **정기**
- KPI 카드의 "추가위험요인", "조치/이행확인"은 **수시 문서만** 집계
- 차트 데이터도 **수시 문서만** 반영
- 테이블은 계층 구조로 확장 가능하게 구현

#### 구현 내용

**백엔드 변경사항**:

1. **새로운 Pydantic 스키마** (`backend/api/schemas/risk.py`):
```python
class RiskChartData(BaseModel):
    date: str
    risk_count: int = 0
    action_count: int = 0

class RiskDocTypeStats(BaseModel):
    doc_type: str  # 최초, 수시, 정기
    doc_count: int = 0
    risk_count: int = 0
    measure_count: int = 0
    action_count: int = 0   # 수시만 해당
    confirm_count: int = 0  # 수시만 해당

class RiskCompanyRow(BaseModel):
    id: str
    label: str
    doc_types: List[RiskDocTypeStats]
    total_doc_count: int = 0
    total_risk_count: int = 0
    # ... 기타 집계 필드

class RiskSiteRow(BaseModel):
    id: str
    label: str
    companies: List[RiskCompanyRow]
    # ... 기타 집계 필드

class RiskDailyResponse(BaseModel):
    summary: RiskSummary
    rows: List[RiskCompanyRow]
    chart_data: List[RiskChartData] = []

class RiskAllSitesResponse(BaseModel):
    summary: RiskSummary
    rows: List[RiskSiteRow]
    chart_data: List[RiskChartData] = []
```

2. **새로운 API 엔드포인트** (`backend/api/routes/risk.py`):
| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/risk/daily` | 특정 현장 문서타입별 통계 (2단계 계층) |
| `GET /api/risk/all-sites` | 전체 현장 문서타입별 통계 (3단계 계층) |

3. **서비스 함수** (`backend/services/risk_service.py`):
- `get_risk_daily_summary(site_id, date_str, period)` - 특정 현장용
- `get_risk_all_sites_summary(date_str, period)` - 전체 현장용

**프론트엔드 변경사항**:

1. **TypeScript 타입 추가** (`api/types.ts`):
- `RiskDocTypeStats`, `RiskCompanyRow`, `RiskSiteRow`
- `RiskDailyResponse`, `RiskAllSitesResponse`

2. **API 클라이언트 함수** (`api/client.ts`):
```typescript
riskApi.getDaily(siteId, date, period)    // 특정 현장
riskApi.getAllSites(date, period)          // 전체 현장
```

3. **RiskAssessmentView.tsx 리팩토링**:
- 특정 현장: 협력사 → 문서타입 (2단계 확장 테이블)
- 전체 현장: 현장 → 협력사 → 문서타입 (3단계 확장 테이블)
- KPI 카드에 툴팁 추가: "수시 위험성평가 데이터만 반영됩니다"

#### 커밋 이력 (risk-assessment-type 브랜치)
- `8882ac2`: feat: 위험성평가 문서타입별(최초/수시/정기) 통계 테이블 구현
- `ee8e756`: feat: 전체 현장 위험성평가 3단계 계층 구조 구현

### 0.2 ETL 실행 결과 (2025-12-21)

#### 처리된 데이터
| 구분 | 파일 수 | 레코드 수 | 비고 |
|------|---------|-----------|------|
| 출퇴근 | 549 | 4,231 | - |
| 위험성평가 | 102 | 1,915 항목, 497 확인 | - |
| TBM | 443 | 1,651 참가자 | 1개 파일 오류 |

#### 오류 파일 (제외됨)
- `tbm_(주)삼천리이에스 안양아삼파워 연료전지 발전사업_삼천리ENG_250614_1.xlsx`
- 오류: `NOT NULL constraint failed: tbm_logs.work_date` (작업일자 누락)

#### 데이터베이스 현황
| 테이블 | 레코드 수 |
|--------|----------|
| sites | 4 |
| partners | 6 |
| attendance_logs | 4,231 |
| risk_docs | 102 |
| tbm_logs | 443 |

#### 문서 타입별 현황
| 타입 | 문서 수 |
|------|---------|
| 수시 | 98 |
| 정기 | 1 |
| 최초 | 3 |

### 0.4 정기 위험성평가 파싱 버그 수정

**문제**: 정기 위험성평가 문서가 "최초"로 잘못 분류됨

**원인**: `_determine_risk_type()` 메서드가 "정기" 체크 로직 누락
```python
# 수정 전 (backend/etl/risk_parser.py)
if "수시" in sheet_name:
    return "수시"
return "최초"  # 정기도 최초로 처리됨
```

**해결**: 정기 체크 로직 추가
```python
# 수정 후
if "수시" in sheet_name:
    return "수시"
if "정기" in sheet_name:
    return "정기"
return "최초"
```

**확인된 파일**: `위험성평가_...태형건설_250310_250315_0.xlsx`
- 시트 이름: "정기 위험성 평가표"
- 수정 후 정상적으로 "정기"로 분류됨

### 0.3 발생한 이슈 및 해결

#### Pydantic Forward Reference 오류
**문제**: `RiskChartData`가 `RiskDailyResponse`에서 참조되기 전에 정의되지 않음
```
pydantic.errors.PydanticUndefinedAnnotation: name 'RiskChartData' is not defined
```

**해결**: `RiskChartData` 클래스를 `RiskDailyResponse`보다 먼저 정의하도록 순서 변경

#### 서버 포트 충돌
**문제**: 여러 서버가 3000, 3001, 3002 포트에서 실행 중

**해결**: 불필요한 서버 종료
```bash
lsof -ti:3001 -ti:3002 | xargs kill -9
```

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
cd D:\claude-bae\claudeTong\tong-headquarters\source
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 프론트엔드 (Vite)
```bash
cd D:\claude-bae\claudeTong\tong-headquarters\source
npm run dev -- --port 4000
```
- 기본 URL: http://localhost:4000

### ETL 실행
```bash
cd D:\claude-bae\claudeTong\tong-headquarters\source
python -m backend.etl.run_etl
```
- 전체 데이터 처리 시 약 40분 소요

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
