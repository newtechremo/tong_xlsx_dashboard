import React from 'react';
import { Calendar } from 'lucide-react';

interface NoDataMessageProps {
  message?: string;
}

export const NoDataMessage: React.FC<NoDataMessageProps> = ({
  message = '해당 기간에 데이터가 없습니다'
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
      <Calendar className="w-12 h-12 text-gray-300 mb-4" />
      <p className="text-gray-500 text-lg font-medium">{message}</p>
      <p className="text-gray-400 text-sm mt-2">다른 날짜를 선택해 주세요</p>
    </div>
  );
};

export default NoDataMessage;
