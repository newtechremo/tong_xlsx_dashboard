
import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  isWithinInterval,
  endOfWeek,
  endOfMonth,
} from 'date-fns';
import { Site, TimePeriod, DailyStat, Company } from '../types';
import { MOCK_SITES } from '../mockData';
import { dashboardApi } from '../api/client';
import type { DashboardResponse, AttendanceWorker, AttendanceWorkersResponse } from '../api/types';
import { Users, AlertCircle, ShieldAlert, X, LogOut, ShieldX, Info, ListFilter } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import NoDataMessage from './NoDataMessage';

// API mode flag - set to true to use real API
const USE_API = true;

// 환경 내 date-fns 버전 호환성을 위한 헬퍼 함수
const parseISO = (dateString: string) => new Date(dateString);
const startOfWeek = (date: Date, _options?: { weekStartsOn?: number }) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

interface DashboardViewProps {
  selectedSite: Site;
  selectedDate: string;
  period: TimePeriod;
}

interface SummaryRow {
  id: string;
  label: string;
  managerCount: number;
  workerCount: number;
  totalCount: number;
  accidentCount: number;
  seniorManagerCount: number;
  seniorWorkerCount: number;
  totalSeniorCount: number;
  checkoutCount: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
    return (
      <div className="bg-white p-4 border border-gray-200 shadow-xl rounded-lg">
        <p className="text-sm font-black text-slate-800 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-8 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-500">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                {entry.name}:
              </span>
              <span className="font-black text-slate-800">{entry.value.toLocaleString()}명</span>
            </div>
          ))}
          <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-between gap-8 text-xs">
            <span className="font-black text-slate-900">합계:</span>
            <span className="font-black text-blue-600">{total.toLocaleString()}명</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const DashboardView: React.FC<DashboardViewProps> = ({ selectedSite, selectedDate, period }) => {
  const isAllScope = selectedSite.id === 'all';
  const [isSeniorModalOpen, setIsSeniorModalOpen] = useState(false);
  const [isAccidentModalOpen, setIsAccidentModalOpen] = useState(false);

  // Attendance workers modal state
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceWorkersResponse | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // API state
  const [apiData, setApiData] = useState<DashboardResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(USE_API);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    if (!USE_API) return;

    setApiLoading(true);
    setApiError(null);

    const siteId = selectedSite.id === 'all' ? null : parseInt(selectedSite.id, 10);

    dashboardApi.getSummary(siteId, selectedDate, period)
      .then((data) => {
        setApiData(data);
        setApiLoading(false);
      })
      .catch((err) => {
        console.error('Dashboard API error:', err);
        setApiError(err.message || 'Failed to load dashboard data');
        setApiLoading(false);
      });
  }, [selectedSite.id, selectedDate, period]);

  // Handle row click to show attendance workers
  const handleRowClick = (row: SummaryRow) => {
    if (!USE_API) return;

    setAttendanceLoading(true);
    setIsAttendanceModalOpen(true);

    if (isAllScope) {
      // 전체 현장 뷰: row.id는 site_id
      const siteId = parseInt(row.id, 10);
      if (isNaN(siteId)) return;

      dashboardApi.getAttendanceWorkers(siteId, selectedDate, period)
        .then((data) => {
          setAttendanceData(data);
          setAttendanceLoading(false);
        })
        .catch((err) => {
          console.error('Attendance workers API error:', err);
          setAttendanceLoading(false);
        });
    } else {
      // 특정 현장 뷰: selectedSite.id가 site_id, row.id는 partner_id
      const siteId = parseInt(selectedSite.id, 10);
      const partnerId = parseInt(row.id, 10);
      if (isNaN(siteId)) return;

      dashboardApi.getAttendanceWorkers(siteId, selectedDate, period, isNaN(partnerId) ? undefined : partnerId)
        .then((data) => {
          setAttendanceData(data);
          setAttendanceLoading(false);
        })
        .catch((err) => {
          console.error('Attendance workers API error:', err);
          setAttendanceLoading(false);
        });
    }
  };

  // Transform API data to component format
  const dashboardData = useMemo(() => {
    // If using API and data is available, use it
    if (USE_API && apiData) {
      const summary = apiData.summary;
      const rows: SummaryRow[] = apiData.rows.map(row => ({
        id: row.id,
        label: row.label,
        managerCount: row.manager_count,
        workerCount: row.worker_count,
        totalCount: row.total_count,
        accidentCount: row.accident_count,
        seniorManagerCount: row.senior_manager_count,
        seniorWorkerCount: row.senior_worker_count,
        totalSeniorCount: row.total_senior_count,
        checkoutCount: row.checkout_count
      }));

      const totalStats = {
        m: summary.manager_count,
        w: summary.field_worker_count,
        t: summary.total_workers,
        sM: summary.senior_managers,
        sW: summary.senior_workers,
        sT: summary.senior_total,
        cO: summary.checkout_count,
        acc: summary.accident_count
      };

      // Calculate chart data for API path
      const chartData = rows.map(row => ({
        name: row.label,
        managerCount: row.managerCount,
        workerCount: row.workerCount
      }));

      const pieData = [
        { name: '65세 미만', value: totalStats.t - totalStats.sT },
        { name: '65세 이상', value: totalStats.sT },
      ];

      return {
        totalStats,
        summaryRows: rows,
        checkoutRate: Math.round(summary.checkout_rate),
        chartData,
        pieData
      };
    }

    // Fallback to mock data computation
    const targetDate = parseISO(selectedDate);
    let interval: { start: Date; end: Date };

    if (period === TimePeriod.DAILY) {
      interval = { start: targetDate, end: targetDate };
    } else if (period === TimePeriod.WEEKLY) {
      interval = { start: startOfWeek(targetDate, { weekStartsOn: 1 }), end: endOfWeek(targetDate, { weekStartsOn: 1 }) };
    } else {
      interval = { start: startOfMonth(targetDate), end: endOfMonth(targetDate) };
    }

    const aggregateDailyStats = (companies: Company[]) => {
      let m = 0, w = 0, t = 0, sM = 0, sW = 0, sT = 0, cO = 0, acc = 0;
      companies.forEach(co => {
        co.tasks.forEach(task => {
          task.dailyStats.forEach(stat => {
            if (isWithinInterval(parseISO(stat.date), interval)) {
              m += stat.managerCount;
              w += stat.fieldWorkerCount;
              t += stat.workerCount;
              sM += stat.seniorManagerCount;
              sW += stat.seniorFieldWorkerCount;
              sT += stat.seniorCount;
              cO += stat.checkedOutCount;
              acc += stat.accidents;
            }
          });
        });
      });
      return { m, w, t, sM, sW, sT, cO, acc };
    };

    const totalStats = aggregateDailyStats(isAllScope ? MOCK_SITES.flatMap(s => s.companies) : selectedSite.companies);

    let summaryRows: SummaryRow[] = [];
    if (isAllScope) {
      summaryRows = MOCK_SITES.map(site => {
        const stats = aggregateDailyStats(site.companies);
        return {
          id: site.id,
          label: site.name,
          managerCount: stats.m,
          workerCount: stats.w,
          totalCount: stats.t,
          accidentCount: stats.acc,
          seniorManagerCount: stats.sM,
          seniorWorkerCount: stats.sW,
          totalSeniorCount: stats.sT,
          checkoutCount: stats.cO
        };
      });
    } else {
      summaryRows = selectedSite.companies.map(co => {
        const stats = aggregateDailyStats([co]);
        return {
          id: co.id,
          label: co.name,
          managerCount: stats.m,
          workerCount: stats.w,
          totalCount: stats.t,
          accidentCount: stats.acc,
          seniorManagerCount: stats.sM,
          seniorWorkerCount: stats.sW,
          totalSeniorCount: stats.sT,
          checkoutCount: stats.cO
        };
      });
    }

    const checkoutRate = totalStats.t > 0 ? Math.round((totalStats.cO / totalStats.t) * 100) : 0;

    // Calculate chart data here to avoid hooks rule violation
    const chartData = summaryRows.map(row => ({
      name: row.label,
      managerCount: row.managerCount,
      workerCount: row.workerCount
    }));

    const pieData = [
      { name: '65세 미만', value: totalStats.t - totalStats.sT },
      { name: '65세 이상', value: totalStats.sT },
    ];

    return {
      totalStats,
      summaryRows,
      checkoutRate,
      chartData,
      pieData
    };
  }, [selectedSite, selectedDate, period, apiData]);

  // Show loading state for API
  if (USE_API && apiLoading) {
    return <LoadingSpinner message="출퇴근 데이터를 불러오는 중..." />;
  }

  // Show error state for API
  if (USE_API && apiError) {
    return <ErrorMessage message={apiError} onRetry={() => {
      setApiLoading(true);
      setApiError(null);
      const siteId = selectedSite.id === 'all' ? null : parseInt(selectedSite.id, 10);
      dashboardApi.getSummary(siteId, selectedDate, period)
        .then((data) => { setApiData(data); setApiLoading(false); })
        .catch((err) => { setApiError(err.message); setApiLoading(false); });
    }} />;
  }

  // Show no data message when API returns empty data
  if (USE_API && apiData && apiData.summary.total_workers === 0) {
    return <NoDataMessage message="해당 기간에 출퇴근 데이터가 없습니다" />;
  }

  const PIE_COLORS = ['#2E2E5D', '#F97316']; 

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ContextKPICard 
          title="총 출근 현황" 
          value={`${dashboardData.totalStats.t.toLocaleString()}명`}
          subText={`관리자: ${dashboardData.totalStats.m} / 근로자: ${dashboardData.totalStats.w}`}
          icon={Users}
          color="slate"
        />

        <ContextKPICard 
          title="65세 이상 고령자" 
          value={`${dashboardData.totalStats.sT.toLocaleString()}명`}
          subText={`관리자: ${dashboardData.totalStats.sM} / 근로자: ${dashboardData.totalStats.sW}`}
          icon={AlertCircle}
          color="orange"
          onClick={() => setIsSeniorModalOpen(true)}
        />

        <ContextKPICard 
          title="퇴근 관리" 
          value={`${dashboardData.checkoutRate}%`}
          subText={dashboardData.checkoutRate < 50 ? "미퇴근 인원이 많습니다" : "퇴근 체크 정상"}
          icon={LogOut}
          color="indigo"
          isWarning={dashboardData.checkoutRate < 50}
        />

        <ContextKPICard 
          title="안전 사고" 
          value={`${dashboardData.totalStats.acc}건`}
          subText={dashboardData.totalStats.acc > 0 ? "즉시 조치가 필요합니다" : "사고 없음"}
          icon={ShieldAlert}
          color="danger"
          isDanger={dashboardData.totalStats.acc > 0}
          onClick={() => setIsAccidentModalOpen(true)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-500 uppercase tracking-tight">
              {isAllScope ? '현장별 인원 현황' : '소속회사별 인원 현황'}
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tighter">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#7D4E4E]"></div> <span>관리자</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#2E2E5D]"></div> <span>근로자</span></div>
              <span className="text-gray-400 font-medium ml-2">* 단위: 명</span>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11, fontWeight: 700, fill: '#64748b'}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11, fontWeight: 700, fill: '#64748b'}} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc', opacity: 0.4}} />
                <Bar dataKey="workerCount" name="근로자" stackId="a" fill="#2E2E5D" radius={[0, 0, 4, 4]} barSize={32} />
                <Bar dataKey="managerCount" name="관리자" stackId="a" fill="#7D4E4E" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-300 flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-slate-500 uppercase tracking-tight mb-8 w-full text-left">연령별 인원 분포</h3>
          <div className="h-[280px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboardData.pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                  {dashboardData.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-8 mt-6 w-full px-4">
             <div className="flex flex-col items-center">
               <div className="flex items-center gap-1.5 mb-1">
                 <div className="w-2 h-2 rounded-full bg-[#2E2E5D]"></div>
                 <span className="text-[10px] font-black text-slate-400">65세 미만</span>
               </div>
               <span className="text-lg font-black text-slate-800">{dashboardData.pieData[0].value}명</span>
             </div>
             <div className="flex flex-col items-center">
               <div className="flex items-center gap-1.5 mb-1">
                 <div className="w-2 h-2 rounded-full bg-[#F97316]"></div>
                 <span className="text-[10px] font-black text-slate-400">65세 이상</span>
               </div>
               <span className="text-lg font-black text-orange-600">{dashboardData.pieData[1].value}명</span>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
        <div className="px-8 py-5 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg text-white">
              <ListFilter size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">통계 요약 리포트</h3>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-200 text-sm font-black text-slate-900 uppercase tracking-widest">
                <th className="px-8 py-5 text-center border-r border-gray-200">구분</th>
                <th colSpan={3} className="px-6 py-5 text-center bg-blue-50/30 border-r border-gray-200">전체 출근 현황</th>
                <th className="px-6 py-5 text-center bg-red-50/30 border-r border-gray-200">사고 발생</th>
                <th colSpan={3} className="px-6 py-5 text-center bg-orange-50/30 border-r border-gray-200">65세 이상 고령자</th>
                <th colSpan={2} className="px-6 py-5 text-center bg-green-50/30">퇴근 현황</th>
              </tr>
              <tr className="bg-white border-b border-gray-100 text-sm font-black text-slate-600 uppercase tracking-tighter">
                <th className="px-8 py-3 text-center border-r border-gray-100">{isAllScope ? '현장명' : '소속회사명'}</th>
                <th className="px-4 py-3 text-center bg-blue-50/10 border-r border-gray-50">관리자</th>
                <th className="px-4 py-3 text-center bg-blue-50/10 border-r border-gray-50">근로자</th>
                <th className="px-4 py-3 text-center bg-blue-50/20 border-r border-gray-100 text-blue-700">계</th>
                <th className="px-4 py-3 text-center bg-red-50/10 border-r border-gray-100 text-red-600">건수</th>
                <th className="px-4 py-3 text-center bg-orange-50/10 border-r border-gray-50">관리자</th>
                <th className="px-4 py-3 text-center bg-orange-50/10 border-r border-gray-50">근로자</th>
                <th className="px-4 py-3 text-center bg-orange-50/20 border-r border-gray-100 text-orange-700">계</th>
                <th className="px-4 py-3 text-center bg-green-50/10 border-r border-gray-50 text-green-700">퇴근인원</th>
                <th className="px-4 py-3 text-center bg-green-50/10 text-green-700">퇴근율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {dashboardData.summaryRows.map((row, idx) => {
                const rate = row.totalCount > 0 ? Math.round((row.checkoutCount / row.totalCount) * 100) : 0;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(row)}
                    title="클릭하여 출근자 명단 보기"
                  >
                    <td className="px-8 py-4 text-center font-bold text-slate-600 border-r border-gray-100 whitespace-nowrap hover:text-blue-600">{row.label}</td>
                    <td className="px-4 py-4 text-center font-black text-slate-700 border-r border-gray-50">{row.managerCount.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center font-black text-slate-700 border-r border-gray-50">{row.workerCount.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center font-black text-blue-700 bg-blue-50/5 border-r border-gray-100">{row.totalCount.toLocaleString()}</td>
                    <td className={`px-4 py-4 text-center font-black border-r border-gray-100 ${row.accidentCount > 0 ? 'text-red-600 bg-red-50/10 animate-pulse' : 'text-slate-300'}`}>
                      {row.accidentCount > 0 ? `${row.accidentCount}건` : '-'}
                    </td>
                    <td className="px-4 py-4 text-center font-black text-slate-700 border-r border-gray-50">{row.seniorManagerCount || '-'}</td>
                    <td className="px-4 py-4 text-center font-black text-slate-700 border-r border-gray-50">{row.seniorWorkerCount || '-'}</td>
                    <td className="px-4 py-4 text-center font-black text-orange-700 bg-orange-50/5 border-r border-gray-100">{row.totalSeniorCount || '-'}</td>
                    <td className="px-4 py-4 text-center font-black text-green-700 border-r border-gray-50">{row.checkoutCount.toLocaleString()}</td>
                    <td className={`px-4 py-4 text-center font-black ${rate < 50 ? 'text-orange-500 bg-orange-50/10' : 'text-green-600'}`}>
                      {rate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-black text-sm">
                <td className="px-8 py-5 text-center border-r border-slate-700 uppercase tracking-widest">합계 (TOTAL)</td>
                <td className="px-4 py-5 text-center border-r border-slate-800">{dashboardData.totalStats.m.toLocaleString()}</td>
                <td className="px-4 py-5 text-center border-r border-slate-800">{dashboardData.totalStats.w.toLocaleString()}</td>
                <td className="px-4 py-5 text-center text-blue-400 border-r border-slate-700">{dashboardData.totalStats.t.toLocaleString()}</td>
                <td className="px-4 py-5 text-center text-red-400 border-r border-slate-700">{dashboardData.totalStats.acc.toLocaleString()}</td>
                <td className="px-4 py-5 text-center border-r border-slate-800">{dashboardData.totalStats.sM.toLocaleString()}</td>
                <td className="px-4 py-5 text-center border-r border-slate-800">{dashboardData.totalStats.sW.toLocaleString()}</td>
                <td className="px-4 py-5 text-center text-orange-400 border-r border-slate-700">{dashboardData.totalStats.sT.toLocaleString()}</td>
                <td className="px-4 py-5 text-center border-r border-slate-800">{dashboardData.totalStats.cO.toLocaleString()}</td>
                <td className="px-4 py-5 text-center text-green-400">{dashboardData.checkoutRate}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Attendance Workers Modal */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800">출근자 명단</h3>
                {attendanceData && (
                  <p className="text-sm text-slate-500 mt-1">
                    {attendanceData.site_name} · {attendanceData.total_count}명
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsAttendanceModalOpen(false);
                  setAttendanceData(null);
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              {attendanceLoading ? (
                <div className="p-8 text-center text-slate-500">
                  <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-4"></div>
                  데이터를 불러오는 중...
                </div>
              ) : attendanceData && attendanceData.workers.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr className="text-slate-600 font-bold">
                      <th className="px-4 py-3 text-left">날짜</th>
                      <th className="px-4 py-3 text-left">이름</th>
                      <th className="px-4 py-3 text-center">구분</th>
                      <th className="px-4 py-3 text-left">소속</th>
                      <th className="px-4 py-3 text-center">나이</th>
                      <th className="px-4 py-3 text-center">출근</th>
                      <th className="px-4 py-3 text-center">퇴근</th>
                      <th className="px-4 py-3 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendanceData.workers.map((worker, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-slate-600">{worker.work_date}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{worker.worker_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            worker.role === '관리자' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {worker.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{worker.partner_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={worker.is_senior ? 'text-orange-600 font-bold' : ''}>
                            {worker.age || '-'}
                            {worker.is_senior ? ' 🔸' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{worker.check_in_time || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={worker.check_out_time ? 'text-green-600' : 'text-orange-500'}>
                            {worker.check_out_time || '미퇴근'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {worker.has_accident ? (
                            <span className="text-red-600 font-bold">사고</span>
                          ) : (
                            <span className="text-green-600">무사고</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  출근 기록이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ContextKPICardProps {
  title: string;
  value: string;
  subText: string;
  icon: React.ElementType;
  color: 'slate' | 'orange' | 'green' | 'warning' | 'danger' | 'indigo';
  isWarning?: boolean;
  isDanger?: boolean;
  onClick?: () => void;
}

const ContextKPICard: React.FC<ContextKPICardProps> = ({ 
  title, value, subText, icon: Icon, color, isWarning, isDanger, onClick 
}) => {
  const textColors = {
    slate: 'text-slate-800',
    orange: 'text-orange-600',
    green: 'text-green-600',
    warning: 'text-[#F97316]',
    danger: 'text-[#E11F25]',
    indigo: 'text-indigo-600'
  };

  const iconStyles = {
    slate: 'bg-slate-100 text-slate-500',
    orange: 'bg-orange-50 text-orange-500',
    green: 'bg-green-50 text-green-500',
    warning: 'bg-orange-100 text-[#F97316]',
    danger: 'bg-red-100 text-[#E11F25]',
    indigo: 'bg-indigo-50 text-indigo-500'
  };

  return (
    <div 
      onClick={onClick}
      className={`relative p-8 rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''}`}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-lg font-bold text-slate-500 mb-2 uppercase tracking-tight">{title}</p>
          <h4 className={`text-5xl font-black tracking-tighter ${textColors[color]}`}>{value}</h4>
        </div>
        <div className={`p-4 rounded-2xl ${iconStyles[color]}`}>
          {isWarning && color !== 'indigo' ? <AlertCircle size={32} className="animate-bounce" /> : <Icon size={32} />}
        </div>
      </div>
      {subText && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm font-bold text-slate-400 flex items-center gap-2 leading-tight">
            {(isWarning || color === 'indigo') && <Info size={14} />}
            {subText}
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
