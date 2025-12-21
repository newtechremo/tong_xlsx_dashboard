/**
 * API response types for HyunJangTong 2.0
 */

// Master data types
export interface Site {
  id: number;
  name: string;
}

export interface Partner {
  id: number;
  name: string;
}

// Dashboard types
export interface DashboardSummary {
  total_workers: number;
  manager_count: number;
  field_worker_count: number;
  senior_total: number;
  senior_managers: number;
  senior_workers: number;
  checkout_count: number;
  checkout_rate: number;
  accident_count: number;
}

export interface SummaryRow {
  id: string;
  label: string;
  manager_count: number;
  worker_count: number;
  total_count: number;
  accident_count: number;
  senior_manager_count: number;
  senior_worker_count: number;
  total_senior_count: number;
  checkout_count: number;
  checkout_rate: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  rows: SummaryRow[];
}

export interface SeniorWorker {
  id: number;
  name: string;
  age: number;
  role: string;
  partner: string;
  site: string;
  work_date: string;
}

export interface Accident {
  id: number;
  worker_name: string;
  role: string;
  partner: string;
  site: string;
  work_date: string;
}

// Attendance worker detail
export interface AttendanceWorker {
  work_date: string;
  worker_name: string;
  role: string;
  partner_name: string;
  birth_date: string | null;
  age: number | null;
  is_senior: number;
  check_in_time: string | null;
  check_out_time: string | null;
  has_accident: number;
}

export interface AttendanceWorkersResponse {
  site_id: number;
  site_name: string;
  date: string;
  period: string;
  total_count: number;
  workers: AttendanceWorker[];
}

// Risk Assessment types
export interface RiskSummary {
  participating_companies: number;
  active_documents: number;
  risk_factors: number;
  action_results: number;
}

export interface RiskTableRow {
  id: string;
  label: string;
  comp_count: number;
  doc_count: number;
  risk_count: number;
  action_count: number;
  worker_count: number;
}

export interface RiskChartData {
  date: string;
  risk_count: number;
  action_count: number;
}

export interface RiskSummaryResponse {
  summary: RiskSummary;
  rows: RiskTableRow[];
  chart_data: RiskChartData[];
}

export interface RiskDocument {
  id: number;
  site_name: string;
  partner_name: string;
  start_date: string;
  end_date: string;
  filename: string | null;
  item_count: number;
}

export interface RiskItem {
  id: number;
  risk_factor: string | null;
  action_result: string | null;
}

// 일간 필터용 위험성평가 타입 (문서 타입별 통계)
export interface RiskDocTypeStats {
  doc_type: string;  // 최초, 수시, 정기
  doc_count: number;
  risk_count: number;
  measure_count: number;
  action_count: number;
  confirm_count: number;
}

export interface RiskCompanyRow {
  id: string;
  label: string;
  doc_types: RiskDocTypeStats[];
  total_doc_count: number;
  total_risk_count: number;
  total_measure_count: number;
  total_action_count: number;
  total_confirm_count: number;
}

export interface RiskDailyResponse {
  summary: RiskSummary;
  rows: RiskCompanyRow[];
  chart_data: RiskChartData[];  // 수시 문서 기준 차트 데이터
}

// TBM types
export interface TbmSummary {
  participating_companies: number;
  written_tbm_docs: number;
  total_tbm_attendees: number;
  participation_rate: number;
}

export interface TbmTableRow {
  id: string;
  label: string;
  comp_count: number;
  tbm_count: number;
  total_attendance: number;
  attendees: number;
  rate: number;
}

export interface TbmSummaryResponse {
  summary: TbmSummary;
  rows: TbmTableRow[];
}

export interface TbmLog {
  id: number;
  work_date: string;
  site_name: string;
  partner_name: string;
  content: string | null;
  participant_count: number;
}

export interface TbmParticipant {
  id: number;
  worker_name: string;
}

// 🥚 Easter Egg: TBM 미확인자
export interface TbmUnconfirmedWorker {
  worker_name: string;
  role: string;
  partner_name: string;
  work_date: string;
}

export interface TbmUnconfirmedResponse {
  site_id: number;
  site_name: string;
  date: string;
  period: string;
  total_attendance: number;
  tbm_confirmed: number;
  unconfirmed_count: number;
  unconfirmed_workers: TbmUnconfirmedWorker[];
}
