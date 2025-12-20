
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'red' | 'green' | 'indigo' | 'orange';
  isAlert?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, color, isAlert }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 duration-200 ${isAlert ? 'ring-2 ring-red-100 ring-offset-2' : ''}`}>
      <div className={`p-4 rounded-xl ${colorMap[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-0.5">{title}</p>
        <p className={`text-2xl font-bold ${isAlert ? 'text-red-600' : 'text-slate-800'}`}>
          {value}
        </p>
      </div>
    </div>
  );
};

export default KPICard;
