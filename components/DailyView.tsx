
import React from 'react';
import { Site, Company, Task } from '../types';
import { AlertCircle, CheckCircle2, FileText, ChevronRight, Clock } from 'lucide-react';

interface DailyViewProps {
  site: Site;
  selectedDate: string;
}

const DailyView: React.FC<DailyViewProps> = ({ site, selectedDate }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FileText size={20} className="text-blue-500" />
          일일 상세 점검 현황
        </h3>
        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          {selectedDate} 현황
        </span>
      </div>

      {site.companies.map((company) => (
        <CompanyCard key={company.id} company={company} today={selectedDate} />
      ))}
    </div>
  );
};

const CompanyCard: React.FC<{ company: Company; today: string }> = ({ company, today }) => {
  const activeTasksCount = company.tasks.filter(t => new Date(t.endDate) >= new Date(today)).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
      {/* 협력사 헤더 */}
      <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-blue-600 shadow-sm">
            {company.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-bold text-slate-800">{company.name}</h4>
            <p className="text-xs text-slate-500 font-medium">{company.tradeType}</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
          {activeTasksCount}개 작업 진행 중
        </span>
      </div>

      {/* 작업 목록 */}
      <div className="divide-y divide-gray-100">
        {company.tasks.map((task) => (
          <TaskRow key={task.id} task={task} today={today} />
        ))}
      </div>
    </div>
  );
};

const TaskRow: React.FC<{ task: Task; today: string }> = ({ task, today }) => {
  const isExpired = new Date(task.endDate) < new Date(today);
  const todayStat = task.dailyStats.find(s => s.date === today);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <ChevronRight size={18} className="text-slate-300" />
          </div>
          <div>
            <h5 className="font-semibold text-slate-800 text-lg leading-none mb-1">{task.taskName}</h5>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Clock size={14} /> {task.startDate} ~ {task.endDate}
              {isExpired && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase border border-red-200">
                  기간만료
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
           <div className="text-center px-4 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
             <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">안전 이행률</p>
             <p className={`text-sm font-bold ${task.complianceRate < 50 ? 'text-red-500' : 'text-slate-700'}`}>{task.complianceRate}%</p>
           </div>
        </div>
      </div>

      {/* 상세 현황 박스 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 위험 요소 */}
        <div className={`rounded-xl p-4 border transition-colors ${
          (todayStat?.riskCount || 0) > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className={(todayStat?.riskCount || 0) > 0 ? 'text-red-500' : 'text-slate-400'} />
            <h6 className="text-sm font-bold text-slate-700">안전 위험 요소 ({todayStat?.riskCount || 0}건)</h6>
          </div>
          {todayStat && todayStat.risks.length > 0 ? (
            <ul className="space-y-2">
              {todayStat.risks.map((risk) => (
                <li key={risk.id} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0"></span>
                  {risk.description}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">오늘 보고된 위험 요소가 없습니다.</p>
          )}
        </div>

        {/* 조치 사항 */}
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-green-600" />
            <h6 className="text-sm font-bold text-slate-700">조치 완료 사항 ({todayStat?.actionCount || 0}건)</h6>
          </div>
          {todayStat && todayStat.actions.length > 0 ? (
            <ul className="space-y-2">
              {todayStat.actions.map((action) => (
                <li key={action.id} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0"></span>
                  {action.description}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">현재 진행 중인 조치 사항이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyView;
