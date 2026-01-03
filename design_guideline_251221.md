# 현장통 2.0 디자인 시스템 가이드라인
## (Orange Gradient Theme Edition)

> 작성일: 2025-12-21
> 기반 프로젝트: 현장통 2.0 (HyunJangTong 2.0)
> 테마: Red → Orange Gradient 전환

---

## 1. 컬러 시스템

### 현재 → 오렌지 그라데이션 매핑

| 용도 | 현재 (Red Theme) | 변환 (Orange Gradient) |
|------|------------------|----------------------|
| Primary | `#E31E24` | Gradient: `#F97316` → `#EA580C` |
| Primary Light | `red-50` | `orange-50` |
| Primary Text | `text-red-600` | `text-orange-600` |

### 권장 컬러 팔레트

```css
:root {
  /* Primary - Orange Gradient */
  --primary-start: #F97316;      /* orange-500 */
  --primary-end: #EA580C;        /* orange-600 */
  --primary-light: #FFF7ED;      /* orange-50 */
  --primary-100: #FFEDD5;        /* orange-100 */
  --primary-text: #EA580C;       /* orange-600 */
  --primary-dark: #C2410C;       /* orange-700 */

  /* Background */
  --bg-main: #F9FAFB;            /* gray-50 */
  --bg-card: #FFFFFF;
  --bg-sidebar: #FFFFFF;

  /* Text - Slate Scale */
  --text-primary: #1E293B;       /* slate-800 */
  --text-secondary: #64748B;     /* slate-500 */
  --text-muted: #94A3B8;         /* slate-400 */

  /* Semantic Colors */
  --success: #16A34A;            /* green-600 */
  --warning: #D97706;            /* amber-600 */
  --error: #DC2626;              /* red-600 */
  --info: #2563EB;               /* blue-600 */

  /* Chart Colors */
  --chart-primary: #2E2E5D;      /* Navy */
  --chart-secondary: #F97316;    /* Orange */
  --chart-tertiary: #7D4E4E;     /* Brown */
}
```

### Tailwind CSS 설정

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',  // Primary
          600: '#EA580C',  // Primary Dark
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      }
    }
  }
}
```

---

## 2. 타이포그래피

### 폰트 설정

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
body {
  font-family: 'Inter', sans-serif;
}
```

### 텍스트 스타일 가이드

| 요소 | 클래스 | 예시 |
|------|--------|------|
| Page Title | `text-xl font-black tracking-tight` | 전체 안전관리 대시보드 |
| Section Title | `text-lg font-bold text-slate-500 uppercase` | 현장별 인원 현황 |
| KPI Value | `text-5xl font-black tracking-tighter` | 128명 |
| KPI Label | `text-lg font-bold text-slate-500` | 총 출근 현황 |
| Table Header | `text-sm font-black uppercase tracking-widest` | 구분 |
| Body Text | `text-sm font-medium text-slate-600` | 일반 텍스트 |
| Caption | `text-xs font-bold text-slate-400` | 보조 설명 |

---

## 3. 컴포넌트 스타일

### 3.1 KPI 카드

```tsx
// 기본 KPI 카드
<div className="p-8 rounded-2xl border border-gray-200 bg-white shadow-sm
                transition-all duration-300 hover:shadow-md hover:-translate-y-1">
  <div className="flex items-start justify-between">
    <div>
      <p className="text-lg font-bold text-slate-500 mb-2">{title}</p>
      <h4 className="text-5xl font-black tracking-tighter text-orange-600">
        {value}
      </h4>
    </div>
    <div className="p-4 rounded-2xl bg-orange-50 text-orange-500">
      <Icon size={32} />
    </div>
  </div>
</div>
```

**스펙:**
- Border Radius: `1rem` (rounded-2xl) ~ `1.5rem` (rounded-3xl)
- Border: `1px solid #E5E7EB` (gray-200)
- Shadow: `shadow-sm` → hover시 `shadow-md`
- Padding: `2rem` (p-8)
- Hover: `-translate-y-1` (4px 상승 효과)

### 3.2 버튼

```tsx
// Primary Button (Gradient)
<button className="px-5 py-2.5 rounded-xl font-bold text-white
                   bg-gradient-to-r from-orange-500 to-orange-600
                   hover:from-orange-600 hover:to-orange-700
                   shadow-sm transition-all">
  확인
</button>

// Secondary Button
<button className="px-4 py-2 rounded-md font-bold text-slate-600
                   border border-gray-300 bg-white
                   hover:bg-gray-50 hover:border-gray-400
                   transition-all">
  취소
</button>

// Ghost Button (Active State)
<button className="px-4 py-3 rounded-xl font-bold
                   bg-orange-50 text-orange-600 shadow-sm">
  활성 메뉴
</button>

// Danger Button
<button className="px-4 py-2 rounded-md font-bold text-white
                   bg-red-600 hover:bg-red-700 transition-colors">
  삭제
</button>
```

### 3.3 테이블

```tsx
// 테이블 컨테이너
<div className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
  {/* 테이블 헤더 바 */}
  <div className="px-8 py-5 border-b border-gray-200 bg-gray-50/80 flex items-center gap-3">
    <div className="p-2 bg-slate-900 rounded-lg text-white">
      <ListFilter size={20} />
    </div>
    <h3 className="text-xl font-black text-slate-800">테이블 제목</h3>
  </div>

  <table className="w-full text-left border-collapse">
    {/* 테이블 헤더 */}
    <thead>
      <tr className="bg-slate-50 border-b border-gray-200
                     text-sm font-black text-slate-900 uppercase tracking-widest">
        <th className="px-8 py-5 text-center border-r border-gray-200">구분</th>
        <th className="px-6 py-5 text-center">데이터</th>
      </tr>
    </thead>

    {/* 테이블 바디 */}
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-orange-50 transition-colors cursor-pointer">
        <td className="px-8 py-4 font-bold text-slate-600">라벨</td>
        <td className="px-4 py-4 text-center font-black text-slate-700">값</td>
      </tr>
    </tbody>

    {/* 테이블 푸터 (합계) */}
    <tfoot>
      <tr className="bg-slate-900 text-white font-black text-sm">
        <td className="px-8 py-5 text-center uppercase tracking-widest">
          합계 (TOTAL)
        </td>
        <td className="px-4 py-5 text-center text-orange-400">100</td>
      </tr>
    </tfoot>
  </table>
</div>
```

### 3.4 입력 필드 & 셀렉트

```tsx
// Text Input
<input
  type="text"
  className="px-4 py-2 bg-white border border-gray-300 rounded-md
             text-sm font-bold text-slate-700
             hover:border-orange-400
             focus:outline-none focus:ring-2 focus:ring-orange-100
             transition-all shadow-sm"
/>

// Date Input
<div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md
                border border-gray-300 shadow-sm hover:border-orange-400 transition-all">
  <CalendarDays size={16} className="text-gray-400" />
  <input
    type="date"
    className="bg-transparent border-none focus:ring-0
               text-sm font-bold text-slate-700 cursor-pointer outline-none"
  />
</div>

// Select Dropdown
<div className="relative">
  <select className="pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-md
                     text-sm font-bold text-slate-700 appearance-none cursor-pointer
                     hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100
                     transition-all shadow-sm">
    <option>옵션 1</option>
    <option>옵션 2</option>
  </select>
  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
</div>
```

### 3.5 모달

```tsx
// Modal Overlay + Container
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50
                animate-in fade-in duration-200">
  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh]
                  overflow-hidden animate-in zoom-in-95 duration-200">

    {/* Modal Header */}
    <div className="px-6 py-4 border-b border-gray-200 bg-slate-50
                    flex items-center justify-between">
      <div>
        <h3 className="text-xl font-black text-slate-800">모달 제목</h3>
        <p className="text-sm text-slate-500 mt-1">부제목</p>
      </div>
      <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
        <X size={20} />
      </button>
    </div>

    {/* Modal Content */}
    <div className="overflow-auto max-h-[60vh] p-6">
      {/* 내용 */}
    </div>
  </div>
</div>
```

### 3.6 탭 그룹

```tsx
<div className="flex p-1 bg-gray-100 rounded-lg border border-gray-200 shadow-inner">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      className={`px-5 py-1.5 text-xs font-bold transition-all rounded-md ${
        isActive
          ? 'bg-white text-orange-600 shadow-sm border border-gray-200'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### 3.7 사이드바 메뉴

```tsx
<button className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold
                    rounded-xl transition-all duration-200 ${
  isActive
    ? 'bg-orange-50 text-orange-600 shadow-sm'
    : 'text-slate-500 hover:bg-gray-50 hover:text-slate-900'
}`}>
  <Icon size={20} className={isActive ? 'text-orange-600' : 'text-slate-400'} />
  <span className="flex-1 text-left">{label}</span>
  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>}
</button>
```

### 3.8 상태 표시 컴포넌트

```tsx
// Loading Spinner
<div className="flex flex-col items-center justify-center h-64">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
  <p className="text-gray-500 text-sm">데이터를 불러오는 중...</p>
</div>

// Error Message
<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
  <p className="text-red-600 font-medium mb-2">오류가 발생했습니다</p>
  <button className="inline-flex items-center gap-2 px-4 py-2
                     bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
    <RefreshCw className="w-4 h-4" />
    다시 시도
  </button>
</div>

// No Data Message
<div className="text-center py-20 text-slate-400 font-medium italic">
  해당 기간에 데이터가 없습니다
</div>
```

### 3.9 뱃지 & 태그

```tsx
// 문서 타입 뱃지
<span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700">
  수시
</span>
<span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">
  최초
</span>
<span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">
  정기
</span>

// 역할 뱃지
<span className="px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-700">
  관리자
</span>
<span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">
  근로자
</span>
```

---

## 4. 레이아웃 구조

### 전체 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (w-64)  │        Main Area (flex-1)        │
│  ┌─────────────┐ │  ┌────────────────────────────┐  │
│  │ Logo (h-16) │ │  │     Header (h-16, z-50)    │  │
│  ├─────────────┤ │  ├────────────────────────────┤  │
│  │             │ │  │   Control Bar (z-40)       │  │
│  │   Menu      │ │  ├────────────────────────────┤  │
│  │   Items     │ │  │                            │  │
│  │             │ │  │    Scrollable Content      │  │
│  │             │ │  │    (max-w-[1600px])        │  │
│  │             │ │  │                            │  │
│  └─────────────┘ │  └────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 레이아웃 코드

```tsx
<div className="flex h-screen overflow-hidden bg-gray-50 text-slate-900 font-sans">
  {/* Sidebar */}
  <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-[60]">
    {/* Logo */}
    <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
      ...
    </div>
    {/* Menu */}
    <div className="flex-1 overflow-y-auto pt-6 px-4 pb-6 space-y-1">
      ...
    </div>
  </aside>

  {/* Main Area */}
  <div className="flex-1 flex flex-col min-w-0 relative">
    {/* Header */}
    <header className="bg-white h-16 shrink-0 z-[50] px-6 flex items-center justify-between
                       shadow-sm border-b border-gray-200">
      ...
    </header>

    {/* Control Bar */}
    <div className="bg-white border-b border-gray-200 shrink-0 z-[40] px-6 py-3 shadow-sm">
      ...
    </div>

    {/* Scrollable Content */}
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-[1600px] w-full mx-auto px-6 py-8">
        ...
      </div>
    </main>
  </div>
</div>
```

### Z-Index 계층

| 레이어 | Z-Index | 용도 |
|--------|---------|------|
| Sidebar | `z-60` | 사이드바 |
| Header | `z-50` | 상단 헤더 |
| Modal | `z-50` | 모달 오버레이 |
| Control Bar | `z-40` | 페이지 컨트롤 바 |
| Dropdown | `z-100` | 드롭다운 메뉴 |

---

## 5. 아이콘 시스템

### 라이브러리

```bash
npm install lucide-react
```

### 주요 아이콘

```tsx
import {
  // 네비게이션
  Activity,        // 대시보드/출퇴근
  ClipboardList,   // 위험성평가
  FileSearch,      // TBM

  // 상태/액션
  Users,           // 인원/출근
  AlertCircle,     // 경고/고령자
  ShieldAlert,     // 안전/사고
  LogOut,          // 퇴근

  // UI 요소
  ChevronDown,     // 드롭다운
  ChevronUp,       // 접기
  ChevronRight,    // 확장
  CalendarDays,    // 날짜
  ListFilter,      // 필터/테이블
  Search,          // 검색
  X,               // 닫기
  RefreshCw,       // 새로고침

  // 정보
  HelpCircle,      // 도움말/툴팁
  Info,            // 정보
  Building2,       // 회사/현장
  FileText,        // 문서
  ShieldCheck,     // 확인/완료
} from 'lucide-react';
```

### 아이콘 크기 가이드

| 용도 | 크기 |
|------|------|
| Navigation Menu | `20px` |
| KPI Card | `32px` |
| Table Header Icon | `20px` |
| Button Icon | `16-18px` |
| Inline Icon | `14-16px` |

---

## 6. 애니메이션 & 트랜지션

### 기본 트랜지션

```css
/* 전체 속성 트랜지션 */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* 색상만 트랜지션 */
.transition-colors {
  transition-property: color, background-color, border-color;
}
```

### 지속 시간

| 클래스 | 시간 | 용도 |
|--------|------|------|
| `duration-200` | 200ms | 빠른 인터랙션 (버튼, 호버) |
| `duration-300` | 300ms | 부드러운 효과 (카드, 드롭다운) |
| `duration-500` | 500ms | 느린 등장 효과 (페이지 전환) |
| `duration-700` | 700ms | 강조 등장 효과 |

### 호버 효과

```tsx
// 카드 상승 효과
<div className="hover:-translate-y-1 hover:shadow-md transition-all duration-300">

// 텍스트 색상 변경
<span className="hover:text-orange-600 transition-colors">

// 배경색 변경
<tr className="hover:bg-orange-50 transition-colors">
```

### 등장 애니메이션 (Tailwind animate-in)

```tsx
// 페이드 인
<div className="animate-in fade-in duration-500">

// 슬라이드 업
<div className="animate-in slide-in-from-bottom-4 duration-700">

// 줌 인
<div className="animate-in zoom-in-95 duration-200">
```

### 펄스 효과 (위험/경고 표시)

```tsx
<td className="animate-pulse text-red-600">사고 발생</td>
```

---

## 7. 반응형 디자인

### 브레이크포인트

```css
/* Tailwind 기본값 */
sm: 640px   /* 모바일 랜드스케이프 */
md: 768px   /* 태블릿 */
lg: 1024px  /* 작은 데스크톱 */
xl: 1280px  /* 데스크톱 */
2xl: 1536px /* 대형 모니터 */
```

### 반응형 그리드 패턴

```tsx
// KPI 카드 그리드
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 모바일: 1열, 태블릿: 2열, 데스크톱: 4열 */}
</div>

// 차트 + 사이드 콘텐츠
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">메인 차트 (2/3)</div>
  <div>사이드 콘텐츠 (1/3)</div>
</div>

// 숨김 처리
<div className="hidden md:block">태블릿 이상에서만 표시</div>
<div className="hidden sm:flex">모바일 이상에서만 표시</div>
```

---

## 8. 차트 컬러

### Recharts 기본 설정

```tsx
// 막대 차트 색상
const BAR_COLORS = {
  manager: '#7D4E4E',   // 관리자 (Brown)
  worker: '#2E2E5D',    // 근로자 (Navy)
};

// 파이 차트 색상
const PIE_COLORS = ['#2E2E5D', '#F97316'];  // Navy, Orange

// 툴팁 스타일
<Tooltip
  contentStyle={{
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
  }}
/>
```

---

## 9. 로고 SVG (오렌지 버전)

```tsx
<svg width="140" height="36" viewBox="0 0 150 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  {/* 오렌지 그라데이션 정의 */}
  <defs>
    <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#F97316"/>
      <stop offset="100%" stopColor="#EA580C"/>
    </linearGradient>
  </defs>

  {/* 배경 사각형 */}
  <rect x="0" y="4" width="32" height="32" rx="6" fill="url(#orangeGradient)"/>

  {/* 헬멧 아이콘 */}
  <path d="M16 11C11.5 11 8 14.5 8 19V22H24V19C24 14.5 20.5 11 16 11Z"
        stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M6 22C6 22 5 22 5 23.5C5 25 6.5 25 6.5 25H25.5C25.5 25 27 25 27 23.5C27 22 26 22 26 22"
        stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M12 14.5C12 14.5 13.5 13.5 16 13.5C18.5 13.5 20 14.5 20 14.5"
        stroke="white" strokeWidth="1" strokeLinecap="round"/>
  <path d="M11 25V27C11 28.1 11.9 29 13 29H19C20.1 29 21 28.1 21 27V25"
        stroke="white" strokeWidth="1.5" strokeLinecap="round"/>

  {/* 텍스트 */}
  <text x="38" y="28" fill="#1A1A1A"
        style={{ font: '900 22px "Inter", sans-serif', letterSpacing: '-1px' }}>
    현장통2.0
  </text>
</svg>
```

---

## 10. 빠른 변환 치트시트

기존 Red 테마에서 Orange 테마로 변환할 때 참고:

| 기존 (Red) | 변환 (Orange) |
|------------|---------------|
| `#E31E24` | `#F97316` 또는 그라데이션 |
| `bg-red-50` | `bg-orange-50` |
| `bg-red-100` | `bg-orange-100` |
| `text-red-600` | `text-orange-600` |
| `border-red-*` | `border-orange-*` |
| `ring-red-*` | `ring-orange-*` |
| `hover:bg-red-*` | `hover:bg-orange-*` |

### 그라데이션 적용

```tsx
// 단색에서 그라데이션으로
// Before
<div className="bg-red-600">

// After
<div className="bg-gradient-to-r from-orange-500 to-orange-600">
```

---

## 부록: 의존성 패키지

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "lucide-react": "^0.561.0",
    "recharts": "^3.6.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "tailwindcss": "^3.4.0",
    "vite": "^6.0.0"
  }
}
```

---

*이 가이드라인은 현장통 2.0 프로젝트의 실제 코드를 분석하여 작성되었습니다.*
