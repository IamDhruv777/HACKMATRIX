import React from 'react';
import { Inbox } from 'lucide-react';

interface Props {
  message: string;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<Props> = ({ message, icon }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-800/40 rounded-xl border border-dashed border-slate-700 min-h-[250px]">
    <div className="text-slate-400 mb-4">
      {icon || <Inbox className="w-12 h-12" />}
    </div>
    <h3 className="text-lg font-medium text-white">No Data Available</h3>
    <p className="text-slate-400 mt-2 max-w-sm">{message}</p>
  </div>
);

export default EmptyState;
