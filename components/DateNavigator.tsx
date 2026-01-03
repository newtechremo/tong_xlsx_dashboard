
import React from 'react';
import { 
  format, 
  endOfWeek, 
  addWeeks, 
  addMonths, 
} from 'date-fns';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { TimePeriod } from '../types';

// FIX: Helper functions to replace missing date-fns exports (startOfWeek, startOfMonth, parseISO) 
// encountered in the current environment's version of the library.
const parseISO = (dateString: string) => new Date(dateString);
const startOfWeek = (date: Date, _options?: { weekStartsOn?: number }) => {
  const d = new Date(date);
  const day = d.getDay();
  // Standard logic for weekStartsOn: 1 (Monday)
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

interface DateNavigatorProps {
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  selectedDate: string; // ISO string (YYYY-MM-DD)
  onDateChange: (date: string) => void;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ 
  period, 
  onPeriodChange, 
  selectedDate, 
  onDateChange 
}) => {
  const date = parseISO(selectedDate);

  // 주간 리스트 생성 (현재 선택된 날짜 기준 -4주 ~ +4주)
  const generateWeeks = () => {
    const weeks = [];
    // 기준이 되는 주의 월요일 찾기
    const currentWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    
    for (let i = -4; i <= 4; i++) {
      const targetWeekStart = addWeeks(currentWeekStart, i);
      const targetWeekEnd = endOfWeek(targetWeekStart, { weekStartsOn: 1 });
      
      const val = format(targetWeekStart, 'yyyy-MM-dd');
      weeks.push({
        id: val,
        label: `${format(targetWeekStart, 'yyyy-MM-dd')} (월) ~ ${format(targetWeekEnd, 'yyyy-MM-dd')} (일)`,
        value: val
      });
    }
    return weeks;
  };

  // 월간 리스트 생성 (해당 연도 1월 ~ 12월)
  const generateMonths = () => {
    const months = [];
    const yearStart = new Date(date.getFullYear(), 0, 1);
    for (let i = 0; i < 12; i++) {
      const targetMonth = addMonths(yearStart, i);
      const val = format(targetMonth, 'yyyy-MM-01');
      months.push({
        id: val,
        label: format(targetMonth, 'yyyy-MM'),
        value: val
      });
    }
    return months;
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-4">
      {/* 탭 그룹 */}
      <div className="flex p-1 bg-gray-100 rounded-lg border border-gray-200 shadow-inner">
        {[
          { id: TimePeriod.DAILY, label: '일간' },
          { id: TimePeriod.WEEKLY, label: '주간' },
          { id: TimePeriod.MONTHLY, label: '월간' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onPeriodChange(tab.id)}
            className={`px-5 py-1.5 text-xs font-bold transition-all rounded-md ${
              period === tab.id 
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 컨텍스트별 셀렉터 */}
      <div className="flex items-center gap-2">
        {period === TimePeriod.DAILY && (
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md border border-gray-300 shadow-sm hover:border-blue-400 transition-all">
            <CalendarDays size={16} className="text-gray-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 cursor-pointer outline-none"
            />
          </div>
        )}

        {period === TimePeriod.WEEKLY && (
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <CalendarDays size={16} />
            </div>
            <select
              value={format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')}
              onChange={(e) => onDateChange(e.target.value)}
              className="pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-md text-sm font-bold text-slate-700 appearance-none cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
            >
              {generateWeeks().map((w) => (
                <option key={w.id} value={w.value}>{w.label}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <ChevronDown size={16} />
            </div>
          </div>
        )}

        {period === TimePeriod.MONTHLY && (
          <div className="flex items-center gap-1">
            {/* 이전 연도 버튼 */}
            <button
              onClick={() => {
                const prevYear = new Date(date.getFullYear() - 1, date.getMonth(), 1);
                onDateChange(format(prevYear, 'yyyy-MM-01'));
              }}
              className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-blue-400 transition-all shadow-sm"
              title="이전 연도"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>

            {/* 연도 표시 */}
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-bold text-slate-700 min-w-[70px] text-center">
              {date.getFullYear()}년
            </div>

            {/* 다음 연도 버튼 */}
            <button
              onClick={() => {
                const nextYear = new Date(date.getFullYear() + 1, date.getMonth(), 1);
                onDateChange(format(nextYear, 'yyyy-MM-01'));
              }}
              className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-blue-400 transition-all shadow-sm"
              title="다음 연도"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>

            {/* 월 선택 드롭다운 */}
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <CalendarDays size={16} />
              </div>
              <select
                value={format(startOfMonth(date), 'yyyy-MM-01')}
                onChange={(e) => onDateChange(e.target.value)}
                className="pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-md text-sm font-bold text-slate-700 appearance-none cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              >
                {generateMonths().map((m) => (
                  <option key={m.id} value={m.value}>{m.label}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateNavigator;
