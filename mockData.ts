
import { Site, DailyStat, RiskDetail } from './types';

// Source C: 위험성평가 데이터 (신규)
export const mockRiskDocs = [
  {
    "fileName": "수시 위험성 평가표 (1).xlsx",
    "data": {
      "meta_info": {
        "현장명": "역삼통사현장",
        "업체명": "정이엔지",
        "관리기간": "2025-12-01~2025-12-31",
        "문서_제목": "1차검사 및 진공작업",
        "위험성평가_근로자_이름": ["김철수", "이영희", "박동수", "최민호"]
      },
      "daily_data": [
        { "일자": "2025-12-19", "구분": "추가위험요인", "내용": "작업 발판 고정 상태 불량" },
        { "일자": "2025-12-19", "구분": "조치결과(이행확인)", "내용": "개인보호구 착용 및 발판 재고정" }
      ]
    }
  },
  {
    "fileName": "수시 위험성 평가표 (2).xlsx",
    "data": {
      "meta_info": {
        "현장명": "역삼통사현장",
        "업체명": "대림건설",
        "관리기간": "2025-12-15~2025-12-25",
        "문서_제목": "지붕 판넬 작업",
        "위험성평가_근로자_이름": ["정민지", "강하늘", "홍길동"]
      },
      "daily_data": [
        { "일자": "2025-12-19", "구분": "추가위험요인", "내용": "강풍으로 인한 자재 비래 위험" },
        { "일자": "2025-12-19", "구분": "조치결과", "내용": "자재 결속 및 고정 강화" }
      ]
    }
  },
  {
    "fileName": "수시 위험성 평가표 (3).xlsx",
    "data": {
      "meta_info": {
        "현장명": "시흥 맑은물센터",
        "업체명": "현대엔지니어링",
        "관리기간": "2025-12-10~2025-12-20",
        "문서_제목": "배관 용접 및 수압 테스트",
        "위험성평가_근로자_이름": ["이승엽", "박찬호", "박지성", "김연아", "손흥민"]
      },
      "daily_data": [
        { "일자": "2025-12-19", "구분": "추가위험요인", "내용": "밀폐공간 산소결핍 가능성" },
        { "일자": "2025-12-19", "구분": "이행확인", "내용": "송풍기 가동 및 산소농도 측정" }
      ]
    }
  },
  {
    "fileName": "수시 위험성 평가표 (4).xlsx",
    "data": {
      "meta_info": {
        "현장명": "역삼통사현장",
        "업체명": "정이엔지",
        "관리기간": "2025-12-01~2025-12-31",
        "문서_제목": "전기 배선 공사",
        "위험성평가_근로자_이름": ["황희찬", "이강인"]
      },
      "daily_data": [
        { "일자": "2025-12-19", "구분": "추가위험요인", "내용": "누전 차단기 미작동" },
        { "일자": "2025-12-19", "구분": "추가위험요인", "내용": "가설 전선 피복 손상" },
        { "일자": "2025-12-19", "구분": "조치결과", "내용": "차단기 교체 및 전선 정리 완료" }
      ]
    }
  }
];

// Source A: TBM 데이터 (신규 입력값)
export const mockTbmData = [
  {
    "fileName": "TBM 활동일지 (4).xlsx",
    "data": {
      "siteName": "역삼통사현장", 
      "affiliation": "에스지엔지니어링",
      "dateTime": "2025-12-19",
      "attendeeCount": "4",
      "attendeeNames": "문용기, 김도연, 최길준, 이승태",
      "riskYN": "유",
      "riskCount": "3"
    }
  },
  {
    "fileName": "TBM 활동일지 (5).xlsx",
    "data": {
      "siteName": "역삼통사현장",
      "affiliation": "(주)통하는사람들",
      "dateTime": "2025-12-19",
      "attendeeCount": "8",
      "attendeeNames": "박지성, 손흥민 외 6명",
      "riskYN": "유",
      "riskCount": "2"
    }
  },
  {
    "fileName": "TBM 활동일지 (3).xlsx",
    "data": {
      "siteName": "시흥 맑은물센터",
      "affiliation": "현대엔지니어링",
      "dateTime": "2025-12-19",
      "attendeeCount": "12",
      "attendeeNames": "김철수 외 11명",
      "riskYN": "무",
      "riskCount": "0"
    }
  }
];

// Source B: 출근 데이터
export const mockAttendanceData = [
  ...Array.from({ length: 15 }).map((_, i) => ({
    "uuid": `u-1-${i}`,
    "workDate": "2025-12-19",
    "siteName": "역삼통사현장",
    "companyName": i < 5 ? "에스지엔지니어링" : "(주)통하는사람들",
    "name": `근로자${i}`,
    "category": "Worker"
  })),
  ...Array.from({ length: 20 }).map((_, i) => ({
    "uuid": `u-2-${i}`,
    "workDate": "2025-12-19",
    "siteName": "시흥 맑은물센터",
    "companyName": "현대엔지니어링",
    "name": `근로자${i}`,
    "category": "Worker"
  }))
];

const generateDailyStats = (days: number, seed: number): DailyStat[] => {
  const stats: DailyStat[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const factor = (Math.sin(i + seed) + 1) / 2;
    const riskCount = Math.floor(factor * 6);
    const accidentChance = Math.random();
    const accidents = accidentChance > 0.96 ? 1 : 0; 

    const managerCount = 3 + Math.floor(Math.random() * 5);
    const fieldWorkerCount = 30 + Math.floor(Math.random() * 40);
    const seniorManagerCount = Math.random() > 0.8 ? 1 : 0;
    const seniorFieldWorkerCount = Math.floor(fieldWorkerCount * (0.15 + Math.random() * 0.15));
    
    const totalPeople = managerCount + fieldWorkerCount;
    const checkoutFactor = (i % 7 === 0) ? 0.4 : 0.95; 
    const checkedOutCount = Math.floor(totalPeople * checkoutFactor);

    stats.push({
      date: dateStr,
      riskCount: riskCount,
      actionCount: Math.max(0, riskCount - Math.floor(Math.random() * 2)),
      managerCount,
      fieldWorkerCount,
      seniorManagerCount,
      seniorFieldWorkerCount,
      checkedOutCount,
      accidents,
      workerCount: totalPeople,
      seniorCount: seniorManagerCount + seniorFieldWorkerCount,
      checksCompleted: Math.floor(totalPeople * 0.85),
      risks: riskCount > 0 ? ([
        { id: `r-${seed}-${i}-1`, description: '고소 작업대 안전 고리 미체결', severity: 'High' },
        { id: `r-${seed}-${i}-2`, description: '자재 적재 구간 통로 미확보', severity: 'Medium' }
      ] as RiskDetail[]).slice(0, Math.min(riskCount, 2)) : [],
      actions: riskCount > 0 ? [
        { id: `a-${seed}-${i}-1`, description: '안전 고리 체결 및 교육 실시', status: 'Completed' }
      ] : []
    });
  }
  return stats;
};

export const MOCK_SITES: Site[] = [
  {
    id: 'site-001',
    name: '역삼통사현장',
    companies: [
      {
        id: 'co-1-1',
        name: '현대엔지니어링',
        tradeType: '철골조립',
        totalWorkers: 55,
        seniorWorkers: 12,
        currentAccidents: 0,
        tasks: [{ id: 't1', taskName: '지붕층 철골 양중', startDate: '2024-01-01', endDate: '2025-12-31', complianceRate: 92, dailyStats: generateDailyStats(45, 101) }]
      }
    ]
  },
  {
    id: 'site-002',
    name: '시흥 맑은물센터',
    companies: [
      {
        id: 'co-2-1',
        name: '삼성물산',
        tradeType: '설비공사',
        totalWorkers: 38,
        seniorWorkers: 5,
        currentAccidents: 0,
        tasks: [{ id: 't3', taskName: '배관 용접 작업', startDate: '2024-03-01', endDate: '2025-09-30', complianceRate: 95, dailyStats: generateDailyStats(45, 201) }]
      }
    ]
  }
];

export const ALL_SITES_MOCK: Site = {
  id: 'all',
  name: '전체 현장',
  companies: MOCK_SITES.flatMap(s => s.companies)
};
