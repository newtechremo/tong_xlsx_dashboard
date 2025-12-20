
export enum TimePeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export enum ActiveMenu {
  DASHBOARD = 'DASHBOARD',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  ATTENDANCE = 'ATTENDANCE',
  TBM = 'TBM'
}

export interface RiskDetail {
  id: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface ActionDetail {
  id: string;
  description: string;
  status: 'Completed' | 'Pending';
}

export interface DailyStat {
  date: string;
  riskCount: number;
  actionCount: number;
  risks: RiskDetail[];
  actions: ActionDetail[];
  
  // 확장된 출근 데이터 필드
  managerCount: number;        // 관리자 수
  fieldWorkerCount: number;    // 현장 근로자 수
  seniorManagerCount: number;  // 65세 이상 관리자
  seniorFieldWorkerCount: number; // 65세 이상 근로자
  checkedOutCount: number;     // 퇴근 완료 인원
  accidents: number;           // 사고 발생 건수
  
  // 하위 호환성을 위해 유지
  workerCount: number;         // manager + fieldWorker
  seniorCount: number;         // seniorManager + seniorFieldWorker
  checksCompleted: number;
}

export interface Task {
  id: string;
  taskName: string;
  startDate: string;
  endDate: string;
  dailyStats: DailyStat[];
  complianceRate: number;
}

export interface Company {
  id: string;
  name: string;
  tradeType: string;
  tasks: Task[];
  totalWorkers: number;
  seniorWorkers: number;
  currentAccidents: number;
}

export interface Site {
  id: string;
  name: string;
  companies: Company[];
}

export interface AggregatedStats {
  totalRisks: number;
  totalActions: number;
  avgCompliance: number;
  activeSites: number;
  workerCheckRate: number;
  totalWorkers: number;
  totalSeniors: number;
  totalAccidents: number;
}

// API-compatible site selection type
export interface ApiSite {
  id: number | null; // null means "all sites"
  name: string;
}

// Convert legacy Site to ApiSite
export function toApiSite(site: Site): ApiSite {
  return {
    id: site.id === 'all' ? null : parseInt(site.id, 10) || null,
    name: site.name
  };
}
