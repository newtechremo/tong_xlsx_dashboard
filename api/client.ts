/**
 * API client for HyunJangTong 2.0
 */

import type {
  Site,
  Partner,
  DashboardResponse,
  SeniorWorker,
  Accident,
  AttendanceWorkersResponse,
  RiskSummaryResponse,
  RiskDocument,
  RiskItem,
  RiskDailyResponse,
  RiskAllSitesResponse,
  TbmSummaryResponse,
  TbmLog,
  TbmParticipant,
  TbmUnconfirmedResponse
} from './types';

/**
 * API Base URL - 현재 브라우저 접속 URL 기반으로 동적 결정
 * - 환경변수 VITE_API_URL이 설정되어 있으면 해당 값 사용
 * - 아니면 현재 접속한 hostname + port 8000 사용
 */
const getApiBase = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Use same origin for API (nginx proxies /backend-api to backend)
  return '/backend-api';
};

const API_BASE = getApiBase();

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Master data API
export const masterApi = {
  getSites: () => fetchApi<Site[]>('/sites'),
  getSite: (id: number) => fetchApi<Site>(`/sites/${id}`),
  getPartners: () => fetchApi<Partner[]>('/partners'),
  getPartner: (id: number) => fetchApi<Partner>(`/partners/${id}`),
};

// Dashboard API
export const dashboardApi = {
  getSummary: (siteId: number | null, date: string, period: string) =>
    fetchApi<DashboardResponse>('/dashboard/summary', {
      site_id: siteId ?? undefined,
      date,
      period
    }),

  getSeniors: (siteId: number | null, date: string) =>
    fetchApi<SeniorWorker[]>('/dashboard/seniors', {
      site_id: siteId ?? undefined,
      date
    }),

  getAccidents: (siteId: number | null, date: string, period: string) =>
    fetchApi<Accident[]>('/dashboard/accidents', {
      site_id: siteId ?? undefined,
      date,
      period
    }),

  getAttendanceWorkers: (siteId: number, date: string, period: string, partnerId?: number) =>
    fetchApi<AttendanceWorkersResponse>('/dashboard/attendance/workers', {
      site_id: siteId,
      date,
      period,
      partner_id: partnerId
    }),
};

// Risk Assessment API - consolidated under /dashboard/risk
export const riskApi = {
  getSummary: (siteId: number | null, date: string, period: string) =>
    fetchApi<RiskSummaryResponse>('/dashboard/risk', {
      site_id: siteId ?? undefined,
      date,
      period
    }),

  getDocuments: (siteId: number | null, date: string, period: string) =>
    fetchApi<RiskDocument[]>('/risk/documents', {
      site_id: siteId ?? undefined,
      date,
      period
    }),

  getItems: (docId: number) =>
    fetchApi<RiskItem[]>(`/risk/items/${docId}`),

  // 문서 타입별 통계 (일간/주간/월간 지원) - 특정 현장
  getDaily: (siteId: number, date: string, period: string = 'DAILY') =>
    fetchApi<RiskDailyResponse>('/risk/daily', {
      site_id: siteId,
      date,
      period
    }),

  // 전체 현장 문서 타입별 통계 (현장→협력사→문서타입 구조)
  getAllSites: (date: string, period: string = 'DAILY') =>
    fetchApi<RiskAllSitesResponse>('/risk/all-sites', {
      date,
      period
    }),
};

// TBM API - consolidated under /dashboard/tbm
export const tbmApi = {
  getSummary: (siteId: number | null, date: string, period: string) =>
    fetchApi<TbmSummaryResponse>('/dashboard/tbm', {
      site_id: siteId ?? undefined,
      date,
      period
    }),

  getLogs: (siteId: number | null, date: string) =>
    fetchApi<TbmLog[]>('/tbm/logs', {
      site_id: siteId ?? undefined,
      date
    }),

  getParticipants: (tbmId: number) =>
    fetchApi<TbmParticipant[]>(`/tbm/participants/${tbmId}`),

  // 🥚 Easter Egg: TBM 미확인자 조회
  getUnconfirmed: (siteId: number, date: string, period: string, partnerId?: number) =>
    fetchApi<TbmUnconfirmedResponse>('/tbm/unconfirmed', {
      site_id: siteId,
      date,
      period,
      partner_id: partnerId
    }),
};
