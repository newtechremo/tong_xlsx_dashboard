
import React, { useMemo, useState, useEffect } from 'react';
import {
  Users,
  BarChart3,
  TrendingUp,
  Info,
  Building2,
  FileText,
  ListFilter,
  X,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { TimePeriod, Site } from '../types';
import { mockTbmData, mockAttendanceData, MOCK_SITES } from '../mockData';
import { tbmApi } from '../api/client';
import type { TbmSummaryResponse, TbmUnconfirmedResponse } from '../api/types';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import NoDataMessage from './NoDataMessage';

// API mode flag
const USE_API = true;

interface TbmMonitoringViewProps {
  period: TimePeriod;
  selectedDate: string;
  selectedSite: Site;
  onSiteSelect?: (site: Site) => void;
}

// 데이터 매칭 무결성을 위한 문자열 정규화 함수
const normalize = (str: string) => str.replace(/\s+/g, '').trim();

const TbmMonitoringView: React.FC<TbmMonitoringViewProps> = ({ period, selectedDate, selectedSite, onSiteSelect }) => {
  const isAllSites = selectedSite.id === 'all';

  // API state
  const [apiData, setApiData] = useState<TbmSummaryResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(USE_API);
  const [apiError, setApiError] = useState<string | null>(null);

  // 🥚 Easter Egg: 미확인자 팝업 state
  const [unconfirmedData, setUnconfirmedData] = useState<TbmUnconfirmedResponse | null>(null);
  const [unconfirmedLoading, setUnconfirmedLoading] = useState(false);
  const [isUnconfirmedModalOpen, setIsUnconfirmedModalOpen] = useState(false);

  // 🥚 Easter Egg: 참여율 클릭 핸들러
  const handleRateClick = (siteId: string, partnerId?: string) => {
    if (!USE_API) return;

    const numSiteId = parseInt(siteId, 10);
    if (isNaN(numSiteId)) return;

    setUnconfirmedLoading(true);
    setIsUnconfirmedModalOpen(true);

    const numPartnerId = partnerId ? parseInt(partnerId, 10) : undefined;

    tbmApi.getUnconfirmed(numSiteId, selectedDate, period, isNaN(numPartnerId as number) ? undefined : numPartnerId)
      .then((data) => {
        setUnconfirmedData(data);
        setUnconfirmedLoading(false);
      })
      .catch((err) => {
        console.error('TBM Unconfirmed API error:', err);
        setUnconfirmedLoading(false);
      });
  };

  // Fetch data from API
  useEffect(() => {
    if (!USE_API) return;

    setApiLoading(true);
    setApiError(null);

    const siteId = selectedSite.id === 'all' ? null : parseInt(selectedSite.id, 10);

    tbmApi.getSummary(siteId, selectedDate, period)
      .then((data) => {
        setApiData(data);
        setApiLoading(false);
      })
      .catch((err) => {
        console.error('TBM API error:', err);
        setApiError(err.message || 'Failed to load TBM data');
        setApiLoading(false);
      });
  }, [selectedSite.id, selectedDate, period]);

  // KPI 및 리스트 데이터 계산 로직
  const { globalStats, listRows } = useMemo(() => {
    // Use API data if available
    if (USE_API && apiData) {
      const summary = apiData.summary;
      const rows = apiData.rows.map(row => ({
        id: row.id,
        label: row.label,
        compCount: row.comp_count,
        tbmCount: row.tbm_count,
        totalAtt: row.total_attendance,
        attendees: row.attendees,
        rate: row.rate.toFixed(1),
        originalSite: isAllSites ? MOCK_SITES.find(s => s.name === row.label) : undefined
      }));

      return {
        globalStats: {
          participatingCompanies: summary.participating_companies,
          writtenTbmDocs: summary.written_tbm_docs,
          totalTbmAttendees: summary.total_tbm_attendees,
          participationRate: summary.participation_rate.toFixed(1)
        },
        listRows: rows
      };
    }

    // Fallback to mock data
    const targetDate = selectedDate;
    const targetSiteName = normalize(selectedSite.name);

    // 1. 데이터 필터링 (전역 KPI용)
    const filteredTbm = mockTbmData.filter(item => {
      const dateMatch = item.data.dateTime === targetDate;
      const siteMatch = isAllSites || normalize(item.data.siteName) === targetSiteName;
      return dateMatch && siteMatch;
    });

    const filteredAttendance = mockAttendanceData.filter(item => {
      const dateMatch = item.workDate === targetDate;
      const siteMatch = isAllSites || normalize(item.siteName) === targetSiteName;
      return dateMatch && siteMatch;
    });

    // KPI 1: 참여 업체 수 (고유 업체명)
    const participatingCompanies = new Set(filteredTbm.map(item => normalize(item.data.affiliation))).size;

    // KPI 2: 작성된 TBM 건수
    const writtenTbmDocs = filteredTbm.length;

    // KPI 3: 참석 근로자 합산
    const totalTbmAttendees = filteredTbm.reduce((sum, item) => sum + parseInt(item.data.attendeeCount || '0', 10), 0);

    // KPI 4: 참여율 (참석자 / 총 출근자)
    const totalAttendanceCount = filteredAttendance.length;
    const participationRate = totalAttendanceCount > 0 
      ? Math.min(100, (totalTbmAttendees / totalAttendanceCount) * 100)
      : 0;

    const globalStats = {
      participatingCompanies,
      writtenTbmDocs,
      totalTbmAttendees,
      participationRate: participationRate.toFixed(1)
    };

    // 2. 리스트 행 데이터 생성
    let rows = [];

    if (isAllSites) {
      // Case A: [전체 현장] 선택 시 -> 현장별 그룹핑
      rows = MOCK_SITES.map(site => {
        const sNameNorm = normalize(site.name);
        const siteTbm = mockTbmData.filter(t => t.data.dateTime === targetDate && normalize(t.data.siteName) === sNameNorm);
        const siteAtt = mockAttendanceData.filter(a => a.workDate === targetDate && normalize(a.siteName) === sNameNorm);

        const sCompCount = new Set(siteTbm.map(t => normalize(t.data.affiliation))).size;
        const sTbmCount = siteTbm.length;
        const sAttendees = siteTbm.reduce((sum, t) => sum + parseInt(t.data.attendeeCount || '0', 10), 0);
        const sAttCount = siteAtt.length;
        const sRate = sAttCount > 0 ? Math.min(100, (sAttendees / sAttCount) * 100) : 0;

        return {
          id: site.id,
          label: site.name,
          compCount: sCompCount,
          tbmCount: sTbmCount,
          totalAtt: sAttCount,
          attendees: sAttendees,
          rate: sRate.toFixed(1),
          originalSite: site
        };
      });
    } else {
      // Case B: [특정 현장] 선택 시 -> 소속회사별 그룹핑
      const siteTbm = mockTbmData.filter(t => t.data.dateTime === targetDate && normalize(t.data.siteName) === targetSiteName);
      const siteAtt = mockAttendanceData.filter(a => a.workDate === targetDate && normalize(a.siteName) === targetSiteName);

      const companiesAtSite = Array.from(new Set([
        ...siteTbm.map(t => normalize(t.data.affiliation)),
        ...siteAtt.map(a => normalize(a.companyName))
      ]));

      rows = companiesAtSite.map((compName, idx) => {
        const cNameNorm = normalize(compName);
        const compTbm = siteTbm.filter(t => normalize(t.data.affiliation) === cNameNorm);
        const compAtt = siteAtt.filter(a => normalize(a.companyName) === cNameNorm);

        const cTbmCount = compTbm.length;
        const cAttendees = compTbm.reduce((sum, t) => sum + parseInt(t.data.attendeeCount || '0', 10), 0);
        const cAttCount = compAtt.length;
        const cRate = cAttCount > 0 ? Math.min(100, (cAttendees / cAttCount) * 100) : 0;

        return {
          id: `comp-${idx}`,
          label: compName,
          tbmCount: cTbmCount,
          totalAtt: cAttCount,
          attendees: cAttendees,
          rate: cRate.toFixed(1)
        };
      });
    }

    return { globalStats, listRows: rows };
  }, [selectedDate, selectedSite, isAllSites, apiData]);

  // Show loading state
  if (USE_API && apiLoading) {
    return <LoadingSpinner message="TBM 데이터를 불러오는 중..." />;
  }

  // Show error state
  if (USE_API && apiError) {
    return <ErrorMessage message={apiError} onRetry={() => {
      setApiLoading(true);
      setApiError(null);
      const siteId = selectedSite.id === 'all' ? null : parseInt(selectedSite.id, 10);
      tbmApi.getSummary(siteId, selectedDate, period)
        .then((data) => { setApiData(data); setApiLoading(false); })
        .catch((err) => { setApiError(err.message); setApiLoading(false); });
    }} />;
  }

  // Show no data message when API returns empty data
  if (USE_API && apiData && apiData.summary.written_tbm_docs === 0) {
    return <NoDataMessage message="해당 기간에 TBM 데이터가 없습니다" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 1. KPI 카드 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ContextKPICard 
          title="참여업체" 
          value={`${globalStats.participatingCompanies}개`}
          subText="오늘 TBM 실시 완료 업체"
          icon={Building2}
          color="blue"
        />
        <ContextKPICard 
          title="작성된 TBM" 
          value={`${globalStats.writtenTbmDocs}건`}
          subText="신규 등록된 TBM 활동일지"
          icon={FileText}
          color="slate"
        />
        <ContextKPICard 
          title="참석 근로자" 
          value={`${globalStats.totalTbmAttendees}명`}
          subText="TBM 서명 완료 인원 합계"
          icon={Users}
          color="slate"
        />
        <ContextKPICard 
          title="근로자 참여율(%)" 
          value={`${globalStats.participationRate}%`}
          subText="전체 출근자 대비 TBM 참석률"
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* 2. 상세 리스트 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-200 bg-gray-50/80 flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <ListFilter size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">
              {isAllSites ? '현장별 운영 현황' : `${selectedSite.name} 소속별 현황`}
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-black text-gray-700 uppercase tracking-widest">
                <th className="px-8 py-4 border-r border-gray-100">{isAllSites ? '현장명' : '소속회사명'}</th>
                {isAllSites && (
                  <th className="px-6 py-4 text-center border-r border-gray-100">참여업체</th>
                )}
                <th className="px-6 py-4 text-center border-r border-gray-100">작성된 TBM</th>
                <th className="px-6 py-4 text-center border-r border-gray-100 bg-blue-50/30 text-blue-600">전체 출근</th>
                <th className="px-6 py-4 text-center border-r border-gray-100">참석 근로자</th>
                <th className="px-8 py-4 text-right">근로자 참여율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listRows.map((row) => (
                <tr 
                  key={row.id} 
                  className={`hover:bg-gray-50 transition-colors group ${isAllSites ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (isAllSites && row.originalSite && onSiteSelect) {
                      onSiteSelect(row.originalSite);
                    }
                  }}
                >
                  <td className="px-8 py-5 border-r border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{row.label}</span>
                      {isAllSites && onSiteSelect && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const site: Site = { id: row.id, name: row.label, companies: [] };
                            onSiteSelect(site);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="해당 현장으로 이동"
                        >
                          <ArrowUpRight size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  {isAllSites && (
                    <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">
                      {row.compCount > 0 ? `${row.compCount}개` : '-'}
                    </td>
                  )}
                  <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">
                    {row.tbmCount > 0 ? `${row.tbmCount}건` : '-'}
                  </td>
                  <td className="px-6 py-5 text-center font-black text-blue-700 bg-blue-50/10 border-r border-gray-100">
                    {row.totalAtt > 0 ? `${row.totalAtt}명` : '0명'}
                  </td>
                  <td className="px-6 py-5 text-center font-black text-slate-700 border-r border-gray-50">
                    {row.attendees > 0 ? `${row.attendees}명` : '-'}
                  </td>
                  <td
                    className="px-8 py-5 text-right cursor-pointer hover:bg-orange-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      // 🥚 Easter Egg: 참여율 클릭 시 미확인자 팝업
                      if (isAllSites) {
                        // 전체 현장 뷰: row.id가 site_id
                        handleRateClick(row.id);
                      } else {
                        // 특정 현장 뷰: selectedSite.id가 site_id, row.id가 partner_id
                        handleRateClick(selectedSite.id, row.id);
                      }
                    }}
                    title="🥚 클릭하여 TBM 미확인자 확인"
                  >
                    <div className="flex flex-col items-end">
                      <span className={`text-xl font-black tracking-tighter ${parseFloat(row.rate) < 70 ? 'text-orange-600' : 'text-slate-800'}`}>
                        {row.rate}%
                      </span>
                      <div className="w-20 bg-gray-100 h-1 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${parseFloat(row.rate) < 70 ? 'bg-orange-500' : 'bg-blue-500'}`}
                          style={{width: `${row.rate}%`}}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🥚 Easter Egg: TBM 미확인자 팝업 */}
      {isUnconfirmedModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle size={20} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">🥚 TBM 미확인자 명단</h3>
                  {unconfirmedData && (
                    <p className="text-sm text-slate-500">
                      {unconfirmedData.site_name} · 출근 {unconfirmedData.total_attendance}명 중 {unconfirmedData.unconfirmed_count}명 미확인
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUnconfirmedModalOpen(false);
                  setUnconfirmedData(null);
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              {unconfirmedLoading ? (
                <div className="p-8 text-center text-slate-500">
                  <div className="animate-spin w-8 h-8 border-2 border-orange-300 border-t-orange-600 rounded-full mx-auto mb-4"></div>
                  미확인자를 찾는 중...
                </div>
              ) : unconfirmedData && unconfirmedData.unconfirmed_workers.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-orange-50 sticky top-0">
                    <tr className="text-slate-600 font-bold">
                      <th className="px-4 py-3 text-left">날짜</th>
                      <th className="px-4 py-3 text-left">이름</th>
                      <th className="px-4 py-3 text-center">구분</th>
                      <th className="px-4 py-3 text-left">소속</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {unconfirmedData.unconfirmed_workers.map((worker, idx) => (
                      <tr key={idx} className="hover:bg-orange-50/50">
                        <td className="px-4 py-3 text-slate-600">{worker.work_date}</td>
                        <td className="px-4 py-3 font-bold text-orange-700">{worker.worker_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            worker.role === '관리자' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {worker.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{worker.partner_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-5xl mb-4">🎉</div>
                  <p className="text-green-600 font-bold text-lg">모든 출근자가 TBM에 참석했습니다!</p>
                  <p className="text-slate-400 text-sm mt-2">미확인자가 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ContextKPICard: React.FC<{ 
  title: string; 
  value: string; 
  subText: string; 
  icon: React.ElementType; 
  color: 'blue' | 'orange' | 'slate';
}> = ({ title, value, subText, icon: Icon, color }) => {
  const textColors = {
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    slate: 'text-slate-800'
  };

  const iconStyles = {
    blue: 'bg-blue-50 text-blue-500',
    orange: 'bg-orange-50 text-orange-500',
    slate: 'bg-slate-100 text-slate-500'
  };

  return (
    <div className="p-8 rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-lg font-bold text-slate-500 mb-2 uppercase tracking-tight">{title}</p>
          <h4 className={`text-5xl font-black tracking-tighter ${textColors[color]}`}>{value}</h4>
        </div>
        <div className={`p-4 rounded-2xl ${iconStyles[color]}`}>
          <Icon size={28} />
        </div>
      </div>
      <div className="pt-4 border-t border-gray-100">
        <p className="text-[11px] font-bold text-slate-400 flex items-center gap-2 leading-tight">
          <Info size={13} />
          {subText}
        </p>
      </div>
    </div>
  );
};

export default TbmMonitoringView;
