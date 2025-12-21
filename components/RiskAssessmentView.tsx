
import React, { useMemo, useState, useEffect } from 'react';
import { Site, TimePeriod } from '../types';
import AnalyticsView from './AnalyticsView';
import {
  Building2,
  FileText,
  ShieldCheck,
  Search,
  ListFilter,
  HelpCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { mockRiskDocs, MOCK_SITES } from '../mockData';
import { riskApi } from '../api/client';
import type { RiskSummaryResponse, RiskDailyResponse, RiskAllSitesResponse } from '../api/types';
import { isWithinInterval, endOfWeek, endOfMonth } from 'date-fns';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import NoDataMessage from './NoDataMessage';

// API mode flag
const USE_API = true;

// 로컬 헬퍼 함수
const parseISO = (dateString: string) => new Date(dateString);

const startOfWeekLocal = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonthLocal = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

interface RiskAssessmentViewProps {
  selectedSite: Site;
  selectedDate: string;
  period: TimePeriod;
}

const normalize = (str: string) => str.replace(/\s+/g, '').trim();

const RiskAssessmentView: React.FC<RiskAssessmentViewProps> = ({ selectedSite, selectedDate, period }) => {
  const isAllSites = selectedSite.id === 'all';
  const isDaily = period === TimePeriod.DAILY;

  // API state
  const [apiData, setApiData] = useState<RiskSummaryResponse | null>(null);
  const [dailyData, setDailyData] = useState<RiskDailyResponse | null>(null);
  const [allSitesData, setAllSitesData] = useState<RiskAllSitesResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(USE_API);
  const [apiError, setApiError] = useState<string | null>(null);

  // 테이블 확장 상태 관리 (현장, 협력사)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCompany = (id: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Fetch data from API
  useEffect(() => {
    if (!USE_API) return;

    setApiLoading(true);
    setApiError(null);

    const siteId = selectedSite.id === 'all' ? null : parseInt(selectedSite.id, 10);

    // 특정 현장 선택시: 문서타입별 API 사용 (일간/주간/월간 모두)
    if (siteId !== null) {
      riskApi.getDaily(siteId, selectedDate, period)
        .then((data) => {
          setDailyData(data);
          setApiData(null);
          setAllSitesData(null);
          setApiLoading(false);
          // 기본적으로 모든 행 확장
          setExpandedRows(new Set(data.rows.map(r => r.id)));
        })
        .catch((err) => {
          console.error('Risk Daily API error:', err);
          setApiError(err.message || 'Failed to load risk data');
          setApiLoading(false);
        });
    } else {
      // 전체 현장: 새 API 사용 (현장→협력사→문서타입 구조)
      riskApi.getAllSites(selectedDate, period)
        .then((data) => {
          setAllSitesData(data);
          setApiData(null);
          setDailyData(null);
          setApiLoading(false);
          // 기본적으로 모든 현장 확장
          setExpandedRows(new Set(data.rows.map(r => r.id)));
          // 모든 협력사도 확장
          const companyIds = data.rows.flatMap(site => site.companies.map(c => `${site.id}-${c.id}`));
          setExpandedCompanies(new Set(companyIds));
        })
        .catch((err) => {
          console.error('Risk All Sites API error:', err);
          setApiError(err.message || 'Failed to load risk data');
          setApiLoading(false);
        });
    }
  }, [selectedSite.id, selectedDate, period]);

  const dateRange = useMemo(() => {
    const target = parseISO(selectedDate);
    if (period === TimePeriod.DAILY) return { start: target, end: target };
    if (period === TimePeriod.WEEKLY) {
      const start = startOfWeekLocal(target);
      return { start, end: endOfWeek(start, { weekStartsOn: 1 }) };
    }
    const start = startOfMonthLocal(target);
    return { start, end: endOfMonth(start) };
  }, [selectedDate, period]);

  const riskKpis = useMemo(() => {
    // Use daily API data if available (특정 현장)
    if (USE_API && dailyData) {
      return {
        participatingCompanies: dailyData.summary.participating_companies,
        activeDocuments: dailyData.summary.active_documents,
        riskFactors: dailyData.summary.risk_factors,
        actionResults: dailyData.summary.action_results
      };
    }

    // Use all-sites API data if available (전체 현장)
    if (USE_API && allSitesData) {
      return {
        participatingCompanies: allSitesData.summary.participating_companies,
        activeDocuments: allSitesData.summary.active_documents,
        riskFactors: allSitesData.summary.risk_factors,
        actionResults: allSitesData.summary.action_results
      };
    }

    // Use API data if available (fallback)
    if (USE_API && apiData) {
      return {
        participatingCompanies: apiData.summary.participating_companies,
        activeDocuments: apiData.summary.active_documents,
        riskFactors: apiData.summary.risk_factors,
        actionResults: apiData.summary.action_results
      };
    }

    // Fallback to mock data
    const targetSiteName = normalize(selectedSite.name);
    const validDocs = mockRiskDocs.filter(doc => {
      const siteMatch = isAllSites || normalize(doc.data.meta_info.현장명).includes(targetSiteName);
      if (!siteMatch) return false;
      const [startStr, endStr] = doc.data.meta_info.관리기간.split('~');
      const docStart = parseISO(startStr);
      const docEnd = parseISO(endStr);
      return (docStart <= dateRange.end && docEnd >= dateRange.start);
    });

    const participatingCompanies = new Set(validDocs.map(d => d.data.meta_info.업체명)).size;
    const activeDocuments = validDocs.length;
    let riskFactors = 0;
    let actionResults = 0;

    validDocs.forEach(doc => {
      doc.data.daily_data.forEach(item => {
        const itemDate = parseISO(item.일자);
        if (isWithinInterval(itemDate, dateRange)) {
          if (item.구분.includes('추가위험')) riskFactors++;
          if (item.구분.includes('조치') || item.구분.includes('이행')) actionResults++;
        }
      });
    });

    return { participatingCompanies, activeDocuments, riskFactors, actionResults };
  }, [selectedSite, dateRange, isAllSites, apiData, dailyData, allSitesData]);

  const tableData = useMemo(() => {
    // Use API data if available
    if (USE_API && apiData) {
      return apiData.rows.map(row => ({
        label: row.label,
        compCount: row.comp_count,
        docCount: row.doc_count,
        riskCount: row.risk_count,
        actionCount: row.action_count,
        workerCount: row.worker_count
      }));
    }

    // Fallback to mock data
    const targetSiteName = normalize(selectedSite.name);

    if (isAllSites) {
      return MOCK_SITES.map(site => {
        const sNameNorm = normalize(site.name);
        const siteDocs = mockRiskDocs.filter(doc => {
          const siteMatch = normalize(doc.data.meta_info.현장명).includes(sNameNorm);
          const [startStr, endStr] = doc.data.meta_info.관리기간.split('~');
          return siteMatch && (parseISO(startStr) <= dateRange.end && parseISO(endStr) >= dateRange.start);
        });

        const compCount = new Set(siteDocs.map(d => d.data.meta_info.업체명)).size;
        let riskCount = 0, actionCount = 0, workerCount = 0;
        siteDocs.forEach(doc => {
          workerCount += (doc.data.meta_info.위험성평가_근로자_이름 || []).length;
          doc.data.daily_data.forEach(item => {
            if (isWithinInterval(parseISO(item.일자), dateRange)) {
              if (item.구분.includes('추가위험')) riskCount++;
              if (item.구분.includes('조치') || item.구분.includes('이행')) actionCount++;
            }
          });
        });
        return { label: site.name, compCount, docCount: siteDocs.length, riskCount, actionCount, workerCount };
      });
    } else {
      const siteDocs = mockRiskDocs.filter(doc => {
        const siteMatch = normalize(doc.data.meta_info.현장명).includes(targetSiteName);
        const [startStr, endStr] = doc.data.meta_info.관리기간.split('~');
        return siteMatch && (parseISO(startStr) <= dateRange.end && parseISO(endStr) >= dateRange.start);
      });

      const companies = Array.from(new Set(siteDocs.map(d => d.data.meta_info.업체명)));
      return companies.map(compName => {
        const compDocs = siteDocs.filter(d => d.data.meta_info.업체명 === compName);
        let riskCount = 0, actionCount = 0, workerCount = 0;
        compDocs.forEach(doc => {
          workerCount += (doc.data.meta_info.위험성평가_근로자_이름 || []).length;
          doc.data.daily_data.forEach(item => {
            if (isWithinInterval(parseISO(item.일자), dateRange)) {
              if (item.구분.includes('추가위험')) riskCount++;
              if (item.구분.includes('조치') || item.구분.includes('이행')) actionCount++;
            }
          });
        });
        return { label: compName, docCount: compDocs.length, riskCount, actionCount, workerCount, compCount: 0 };
      });
    }
  }, [selectedSite, dateRange, isAllSites, apiData]);

  // Show loading state
  if (USE_API && apiLoading) {
    return <LoadingSpinner message="위험성평가 데이터를 불러오는 중..." />;
  }

  // Show error state
  if (USE_API && apiError) {
    return <ErrorMessage message={apiError} onRetry={() => {
      setApiLoading(true);
      setApiError(null);
      const siteId = selectedSite.id === 'all' ? null : parseInt(selectedSite.id, 10);
      riskApi.getSummary(siteId, selectedDate, period)
        .then((data) => { setApiData(data); setApiLoading(false); })
        .catch((err) => { setApiError(err.message); setApiLoading(false); });
    }} />;
  }

  // Show no data message when API returns empty data
  const hasNoData = USE_API && (
    (dailyData && dailyData.summary.active_documents === 0) ||
    (allSitesData && allSitesData.summary.active_documents === 0) ||
    (apiData && apiData.summary.active_documents === 0 && !dailyData && !allSitesData)
  );
  if (hasNoData) {
    return <NoDataMessage message="해당 기간에 위험성평가 데이터가 없습니다" />;
  }

  const tableTitle = isAllSites
    ? '현장별 위험성평가 통계'
    : `[${selectedSite.name} 위험성평가 통계]`;

  // 전체 현장: 현장→협력사→문서타입 3단계 구조 테이블
  const renderAllSitesTable = () => {
    if (!allSitesData) return null;

    const typeColors: Record<string, string> = {
      '최초': 'bg-blue-100 text-blue-700',
      '수시': 'bg-orange-100 text-orange-700',
      '정기': 'bg-purple-100 text-purple-700'
    };

    return (
      <div className="bg-white rounded-2xl border border-gray-300 shadow-sm">
        <div className="px-8 py-5 border-b border-gray-200 bg-gray-50/80 flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <ListFilter size={20} />
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">
            전체 현장 위험성평가 통계
          </h3>
        </div>
        <div className="overflow-x-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-black text-gray-700 uppercase tracking-widest">
                <th className="px-8 py-4 border-r border-gray-100">현장 / 협력사</th>
                <th className="px-6 py-4 text-center border-r border-gray-100">위험성평가 문서</th>
                <th className="px-6 py-4 text-center border-r border-gray-100">위험요인</th>
                <th className="px-6 py-4 text-center border-r border-gray-100">개선대책</th>
                <th className="px-6 py-4 text-center border-r border-gray-100 text-green-700 bg-green-50/30">조치결과(이행)</th>
                <th className="px-6 py-4 text-center">확인근로자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allSitesData.rows.map((site) => {
                const isSiteExpanded = expandedRows.has(site.id);
                return (
                  <React.Fragment key={site.id}>
                    {/* 현장 메인 행 */}
                    <tr
                      className="hover:bg-blue-50 transition-colors cursor-pointer group bg-blue-50/30"
                      onClick={() => toggleRow(site.id)}
                    >
                      <td className="px-8 py-5 border-r border-gray-50">
                        <div className="flex items-center gap-2">
                          {isSiteExpanded ? <ChevronDown size={20} className="text-blue-600" /> : <ChevronRight size={20} className="text-blue-600" />}
                          <span className="font-black text-blue-800 text-lg group-hover:text-blue-600 transition-colors">
                            {site.label}
                          </span>
                          <span className="text-sm text-slate-500 ml-2">({site.total_comp_count}개 업체)</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">
                        {site.total_doc_count}건
                      </td>
                      <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">
                        {site.total_risk_count}건
                      </td>
                      <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">
                        {site.total_measure_count}건
                      </td>
                      <td className={`px-6 py-5 text-center font-black border-r border-gray-50 ${site.total_action_count > 0 ? 'text-green-700 bg-green-50/10' : 'text-slate-300'}`}>
                        {site.total_action_count > 0 ? `${site.total_action_count}건` : '-'}
                      </td>
                      <td className={`px-6 py-5 text-center font-black ${site.total_confirm_count > 0 ? 'text-blue-700' : 'text-slate-300'}`}>
                        {site.total_confirm_count > 0 ? `${site.total_confirm_count}명` : '-'}
                      </td>
                    </tr>

                    {/* 협력사별 행 (현장 확장시) */}
                    {isSiteExpanded && site.companies.map((company) => {
                      const companyKey = `${site.id}-${company.id}`;
                      const isCompanyExpanded = expandedCompanies.has(companyKey);
                      return (
                        <React.Fragment key={companyKey}>
                          {/* 협력사 행 */}
                          <tr
                            className="hover:bg-gray-50 transition-colors cursor-pointer group bg-slate-50/50"
                            onClick={() => toggleCompany(companyKey)}
                          >
                            <td className="px-8 py-4 border-r border-gray-100">
                              <div className="flex items-center gap-2 pl-6">
                                {isCompanyExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                                <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                                  {company.label}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-600 border-r border-gray-100">
                              {company.total_doc_count}건
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-600 border-r border-gray-100">
                              {company.total_risk_count}건
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-600 border-r border-gray-100">
                              {company.total_measure_count}건
                            </td>
                            <td className={`px-6 py-4 text-center font-bold border-r border-gray-100 ${company.total_action_count > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                              {company.total_action_count > 0 ? `${company.total_action_count}건` : '-'}
                            </td>
                            <td className={`px-6 py-4 text-center font-bold ${company.total_confirm_count > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                              {company.total_confirm_count > 0 ? `${company.total_confirm_count}명` : '-'}
                            </td>
                          </tr>

                          {/* 문서 타입별 서브행 (협력사 확장시) */}
                          {isCompanyExpanded && company.doc_types.map((docType) => {
                            if (docType.doc_count === 0) return null;

                            const isAdHoc = docType.doc_type === '수시';

                            return (
                              <tr key={`${companyKey}-${docType.doc_type}`} className="bg-white border-t border-gray-100">
                                <td className="px-8 py-3 border-r border-gray-100">
                                  <div className="flex items-center gap-2 pl-14">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeColors[docType.doc_type] || 'bg-gray-100 text-gray-600'}`}>
                                      {docType.doc_type}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-center font-medium text-slate-500 border-r border-gray-100">
                                  {docType.doc_count}건
                                </td>
                                <td className="px-6 py-3 text-center font-medium text-slate-500 border-r border-gray-100">
                                  {docType.risk_count}건
                                </td>
                                <td className="px-6 py-3 text-center font-medium text-slate-500 border-r border-gray-100">
                                  {docType.measure_count}건
                                </td>
                                <td className={`px-6 py-3 text-center font-medium border-r border-gray-100 ${isAdHoc && docType.action_count > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                                  {isAdHoc && docType.action_count > 0 ? `${docType.action_count}건` : '-'}
                                </td>
                                <td className={`px-6 py-3 text-center font-medium ${isAdHoc && docType.confirm_count > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                                  {isAdHoc && docType.confirm_count > 0 ? `${docType.confirm_count}명` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {allSitesData.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                    해당 기간에 유효한 데이터가 존재하지 않습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 특정 현장: 협력사→문서타입 2단계 구조 테이블
  const renderDailyTable = () => {
    if (!dailyData) return null;

    return (
      <div className="bg-white rounded-2xl border border-gray-300 shadow-sm">
        <div className="px-8 py-5 border-b border-gray-200 bg-gray-50/80 flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <ListFilter size={20} />
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">
            {selectedSite.name} 위험성평가 통계
          </h3>
        </div>
        <div className="overflow-x-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-black text-gray-700 uppercase tracking-widest">
                <th className="px-8 py-4 border-r border-gray-100">참여업체</th>
                <th className="px-6 py-4 text-center border-r border-gray-100">위험성평가 문서</th>
                <th className="px-6 py-4 text-center border-r border-gray-100">위험요인</th>
                <th className="px-6 py-4 text-center border-r border-gray-100">개선대책</th>
                <th className="px-6 py-4 text-center border-r border-gray-100 text-green-700 bg-green-50/30">조치결과(이행)</th>
                <th className="px-6 py-4 text-center">확인근로자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dailyData.rows.map((company) => {
                const isExpanded = expandedRows.has(company.id);
                return (
                  <React.Fragment key={company.id}>
                    {/* 회사 메인 행 */}
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => toggleRow(company.id)}
                    >
                      <td className="px-8 py-5 border-r border-gray-50">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                          <span className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                            {company.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">
                        {company.total_doc_count}건
                      </td>
                      <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">
                        {company.total_risk_count}건
                      </td>
                      <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">
                        {company.total_measure_count}건
                      </td>
                      <td className={`px-6 py-5 text-center font-black border-r border-gray-50 ${company.total_action_count > 0 ? 'text-green-700 bg-green-50/10' : 'text-slate-300'}`}>
                        {company.total_action_count > 0 ? `${company.total_action_count}건` : '-'}
                      </td>
                      <td className={`px-6 py-5 text-center font-black ${company.total_confirm_count > 0 ? 'text-blue-700' : 'text-slate-300'}`}>
                        {company.total_confirm_count > 0 ? `${company.total_confirm_count}명` : '-'}
                      </td>
                    </tr>

                    {/* 문서 타입별 서브행 */}
                    {isExpanded && company.doc_types.map((docType) => {
                      // 문서가 없는 타입은 표시하지 않음
                      if (docType.doc_count === 0) return null;

                      const isAdHoc = docType.doc_type === '수시';
                      const typeColors: Record<string, string> = {
                        '최초': 'bg-blue-100 text-blue-700',
                        '수시': 'bg-orange-100 text-orange-700',
                        '정기': 'bg-purple-100 text-purple-700'
                      };

                      return (
                        <tr key={`${company.id}-${docType.doc_type}`} className="bg-slate-50/50 border-t border-gray-100">
                          <td className="px-8 py-3 border-r border-gray-100">
                            <div className="flex items-center gap-2 pl-6">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeColors[docType.doc_type] || 'bg-gray-100 text-gray-600'}`}>
                                {docType.doc_type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center font-bold text-slate-600 border-r border-gray-100">
                            {docType.doc_count}건
                          </td>
                          <td className="px-6 py-3 text-center font-bold text-slate-600 border-r border-gray-100">
                            {docType.risk_count}건
                          </td>
                          <td className="px-6 py-3 text-center font-bold text-slate-600 border-r border-gray-100">
                            {docType.measure_count}건
                          </td>
                          <td className={`px-6 py-3 text-center font-bold border-r border-gray-100 ${isAdHoc && docType.action_count > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                            {isAdHoc && docType.action_count > 0 ? `${docType.action_count}건` : '-'}
                          </td>
                          <td className={`px-6 py-3 text-center font-bold ${isAdHoc && docType.confirm_count > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                            {isAdHoc && docType.confirm_count > 0 ? `${docType.confirm_count}명` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {dailyData.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                    해당 기간에 유효한 데이터가 존재하지 않습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <RiskKpiCard title="참여업체" value={`${riskKpis.participatingCompanies}개`} icon={Building2} color="blue" />
        <RiskKpiCard title="위험성평가 문서" value={`${riskKpis.activeDocuments}건`} icon={FileText} color="slate" />
        <RiskKpiCard title="추가위험요인" value={`${riskKpis.riskFactors}건`} icon={Search} color="red" isHighlight={riskKpis.riskFactors > 0} tooltip="수시 위험성평가 데이터만 반영됩니다." />
        <RiskKpiCard title="조치/이행확인" value={`${riskKpis.actionResults}건`} icon={ShieldCheck} color="green" isHighlight={riskKpis.actionResults > 0} tooltip="수시 위험성평가 데이터만 반영됩니다." />
      </div>

      {(period === TimePeriod.WEEKLY || period === TimePeriod.MONTHLY) && (
        <AnalyticsView site={selectedSite} period={period} selectedDate={selectedDate} apiChartData={dailyData?.chart_data || allSitesData?.chart_data || apiData?.chart_data} />
      )}

      {/* 전체 현장: 현장→협력사→문서타입 3단계 테이블 */}
      {allSitesData ? renderAllSitesTable() : null}

      {/* 특정 현장: 협력사→문서타입 2단계 테이블 */}
      {dailyData ? renderDailyTable() : (!allSitesData && (
        <div className="bg-white rounded-2xl border border-gray-300 shadow-sm">
          <div className="px-8 py-5 border-b border-gray-200 bg-gray-50/80 flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg text-white">
              <ListFilter size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{tableTitle}</h3>
          </div>
          <div className="overflow-x-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-black text-gray-700 uppercase tracking-widest">
                  <th className="px-8 py-4 border-r border-gray-100">{isAllSites ? '현장명' : '참여업체'}</th>
                  {isAllSites && <th className="px-6 py-4 text-center border-r border-gray-100">참여업체</th>}
                  <th className="px-6 py-4 text-center border-r border-gray-100">위험성평가 문서</th>
                  <th className="px-6 py-4 text-center border-r border-gray-100 text-red-600 bg-red-50/30">추가 위험요인</th>
                  <th className="px-6 py-4 text-center border-r border-gray-100 text-green-700 bg-green-50/30">조치결과(이행)</th>
                  <th className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 group relative">
                      확인 근로자
                      <HelpCircle size={14} className="text-blue-500 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-3 w-72 p-5 bg-slate-900 text-white text-[11px] font-medium leading-relaxed rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[100] shadow-2xl border border-slate-700 normal-case tracking-normal transform translate-y-2 group-hover:translate-y-0">
                        확인 근로자는 위험성평가 문서 중 기간이 종료된 데이터에 대해
                        기간 중에 1회이상 확인된 근로자의 숫자입니다.
                        따라서, 일일 출근자 데이터와 매칭되지 않습니다.
                        <div className="absolute top-full right-4 border-[8px] border-transparent border-t-slate-900"></div>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-5 border-r border-gray-50">
                      <div className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{row.label}</div>
                    </td>
                    {isAllSites && <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">{row.compCount}개</td>}
                    <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">{row.docCount}건</td>
                    <td className={`px-6 py-5 text-center font-black border-r border-gray-50 ${row.riskCount > 0 ? 'text-red-600 bg-red-50/10' : 'text-slate-300'}`}>
                      {row.riskCount > 0 ? `${row.riskCount}건` : '-'}
                    </td>
                    <td className={`px-6 py-5 text-center font-black border-r border-gray-50 ${row.actionCount > 0 ? 'text-green-700 bg-green-50/10' : 'text-slate-300'}`}>
                      {row.actionCount > 0 ? `${row.actionCount}건` : '-'}
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-800 text-lg">{row.workerCount.toLocaleString()}명</td>
                  </tr>
                ))}
                {tableData.length === 0 && (
                  <tr>
                    <td colSpan={isAllSites ? 6 : 5} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                      해당 기간에 유효한 데이터가 존재하지 않습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

// KPI 카드 컴포넌트
interface RiskKpiCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'slate' | 'red' | 'green';
  isHighlight?: boolean;
  tooltip?: string;
}

const RiskKpiCard: React.FC<RiskKpiCardProps> = ({ title, value, icon: Icon, color, isHighlight, tooltip }) => {
  const textColors = {
    blue: 'text-blue-600',
    slate: 'text-gray-900',
    red: isHighlight ? 'text-red-600' : 'text-gray-900',
    green: isHighlight ? 'text-green-600' : 'text-gray-900'
  };
  const iconStyles = {
    blue: 'bg-blue-50 text-blue-500',
    slate: 'bg-slate-100 text-slate-500',
    red: isHighlight ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-300',
    green: isHighlight ? 'bg-green-50 text-green-500' : 'bg-slate-100 text-slate-300'
  };

  return (
    <div className="p-8 rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 group relative">
            <p className="text-lg font-bold text-gray-700 uppercase tracking-tight">{title}</p>
            {tooltip && (
              <>
                <HelpCircle size={14} className="text-blue-500 cursor-help" />
                <div className="absolute bottom-full left-0 mb-3 w-60 p-4 bg-slate-900 text-white text-[11px] font-medium leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[100] shadow-2xl border border-slate-700 normal-case tracking-normal transform translate-y-2 group-hover:translate-y-0">
                  {tooltip}
                  <div className="absolute top-full left-4 border-[8px] border-transparent border-t-slate-900"></div>
                </div>
              </>
            )}
          </div>
          <h4 className={`text-5xl font-extrabold tracking-tighter ${textColors[color]}`}>{value}</h4>
        </div>
        <div className={`p-4 rounded-2xl ${iconStyles[color]}`}>
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
};

export default RiskAssessmentView;
