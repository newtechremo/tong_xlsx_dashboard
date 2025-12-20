# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

현장통 2.0 (HyunJangTong 2.0) - Industrial construction site safety management dashboard for monitoring worker attendance, risk assessments, TBM (Tool Box Meeting) activities, and accident tracking.

## Development Commands

### Frontend
```bash
npm install      # Install dependencies
npm run dev      # Start dev server (Vite, port 3000)
npm run build    # Production build
npm run preview  # Preview production build
```

### Backend
```bash
cd backend
pip install -r requirements.txt     # Install Python dependencies
python -m etl.run_etl               # Run ETL to populate database
uvicorn main:app --reload --port 8000   # Start API server
```

**Environment:** Set `VITE_API_URL` in `.env.local` for API endpoint (defaults to `http://localhost:8000/api`)

## Tech Stack

### Frontend
- React 19 + TypeScript 5.8 + Vite 6
- Tailwind CSS (CDN import in index.html)
- Recharts for data visualization
- Lucide React for icons
- date-fns for date utilities

### Backend
- Python 3.10+ with FastAPI
- SQLite database (`backend/database/safety.db`)
- openpyxl for Excel parsing

## Architecture

### Data Hierarchy

```
Site → Company → Task → DailyStat
```

The core domain model follows this hierarchy:
- **Sites** represent construction locations
- **Companies** are contractors/subcontractors at a site
- **Tasks** are work assignments with date ranges
- **DailyStats** contain per-day metrics (workers, risks, actions, accidents)

### View Components

Three main views accessible via sidebar navigation:

| Menu | Component | Purpose |
|------|-----------|---------|
| 출퇴근 (Dashboard) | `DashboardView.tsx` | Attendance/checkout tracking |
| 위험성평가 | `RiskAssessmentView.tsx` | Risk assessment document tracking |
| TBM | `TbmMonitoringView.tsx` | Tool Box Meeting activity logs |

### State Management

- React hooks only (useState, useMemo, useRef)
- No external state library
- Date filtering supports three periods: DAILY, WEEKLY, MONTHLY (via `TimePeriod` enum)
- Site selection filters data globally

### Key Files

- `types.ts` - All TypeScript interfaces and enums
- `mockData.ts` - Development mock data (fallback when API unavailable)
- `api/client.ts` - API client functions
- `api/types.ts` - API response TypeScript types
- `hooks/useApi.ts` - Custom hook for data fetching
- `data_repository/` - Real Excel data files (attendance, risk assessment, TBM)

### Backend Structure

```
backend/
├── main.py              # FastAPI application
├── config.py            # Configuration settings
├── database/
│   ├── schema.py        # SQLite schema
│   └── connection.py    # DB connection utilities
├── etl/
│   ├── run_etl.py       # ETL orchestration
│   ├── attendance_parser.py
│   ├── risk_parser.py
│   └── tbm_parser.py
├── api/routes/          # API endpoints
└── services/            # Business logic
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/sites` | List all sites |
| `GET /api/dashboard/summary` | Dashboard KPIs |
| `GET /api/risk/summary` | Risk assessment KPIs |
| `GET /api/tbm/summary` | TBM KPIs |

Query params: `site_id`, `date` (YYYY-MM-DD), `period` (DAILY/WEEKLY/MONTHLY)

### Database Schema

- `sites`, `partners` - Master data
- `attendance_logs` - Worker attendance
- `risk_docs`, `risk_items` - Risk assessments
- `tbm_logs`, `tbm_participants` - TBM records

## Code Conventions

- Component files: PascalCase `.tsx`
- UI strings are in Korean
- Type enums: `TimePeriod`, `ActiveMenu`
- Domain interfaces: `Site`, `Company`, `Task`, `DailyStat`
- Use `useMemo` for computed/aggregated data
