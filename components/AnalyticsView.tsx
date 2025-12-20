
import React, { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Site, TimePeriod } from '../types';
import { format, endOfWeek, endOfMonth, eachDayOfInterval } from 'date-fns';
import type { RiskChartData } from '../api/types';

// 로컬 헬퍼 함수 (버전 호환성 및 일관성 유지)
const parseISO = (dateString: string) => new Date(dateString);
const startOfWeekLocal = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  // 월요일 시작 고정
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonthLocal = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

interface AnalyticsViewProps {
  site: Site;
  period: TimePeriod;
  selectedDate: string;
  apiChartData?: RiskChartData[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ site, period, selectedDate, apiChartData }) => {
  const isAllSites = site.id === 'all';

  const { chartData, rangeLabel } = useMemo(() => {
    const target = parseISO(selectedDate);
    let start: Date;
    let end: Date;

    if (period === TimePeriod.WEEKLY) {
      // 선택된 날짜가 포함된 주 (월~일)
      start = startOfWeekLocal(target);
      end = endOfWeek(start, { weekStartsOn: 1 });
    } else {
      // 선택된 날짜가 포함된 월 (1일~말일)
      start = startOfMonthLocal(target);
      end = endOfMonth(start);
    }

    // Use API data if available
    if (apiChartData && apiChartData.length > 0) {
      const history = apiChartData.map(item => ({
        date: format(parseISO(item.date), 'MM.dd'),
        fullDate: item.date,
        위험발견: item.risk_count,
        조치완료: item.action_count,
      }));

      const rangeLabel = `${format(start, 'MM.dd')} ~ ${format(end, 'MM.dd')}`;
      return { chartData: history, rangeLabel };
    }

    // Fallback to mock data
    const interval = eachDayOfInterval({ start, end });
    const history = interval.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      let riskCount = 0;
      let actionCount = 0;

      site.companies.forEach(co => {
        co.tasks.forEach(t => {
          const stat = t.dailyStats.find(s => s.date === dateStr);
          if (stat) {
            riskCount += stat.riskCount;
            actionCount += stat.actionCount;
          }
        });
      });

      return {
        date: format(day, 'MM.dd'),
        fullDate: dateStr,
        위험발견: riskCount,
        조치완료: actionCount,
      };
    });

    const rangeLabel = `${format(start, 'MM.dd')} ~ ${format(end, 'MM.dd')}`;

    return { chartData: history, rangeLabel };
  }, [site, period, selectedDate, apiChartData]);

  const chartTitle = isAllSites 
    ? `[전체 현장 위험성평가 통계 - 조치결과, 위험요인 등록현황]` 
    : `[${site.name} 위험성평가 통계 - 조치결과, 위험요인 등록현황]`;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">{chartTitle}</h3>
          <p className="text-xs text-blue-600 font-black mt-1 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
            {period === TimePeriod.WEEKLY ? '주간 통계' : '월간 통계'}: {rangeLabel}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span className="text-[10px] font-black text-slate-600 uppercase">위험 발견</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="text-[10px] font-black text-slate-600 uppercase">조치 완료</span>
          </div>
        </div>
      </div>
      
      {/* 요청대로 높이를 기존 절반 수준인 200px로 조정 */}
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
              interval={period === TimePeriod.MONTHLY ? 2 : 0} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
              allowDecimals={false}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '10px'
              }}
              labelStyle={{ fontWeight: 'black', marginBottom: '4px', fontSize: '12px' }}
            />
            <Line 
              type="monotone" 
              dataKey="위험발견" 
              stroke="#ef4444" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line 
              type="monotone" 
              dataKey="조치완료" 
              stroke="#22c55e" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsView;
