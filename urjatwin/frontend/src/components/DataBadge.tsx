import React from 'react';
import { Database } from 'lucide-react';

const DataBadge = () => (
  <div className="flex items-center space-x-1.5 text-blue-400 bg-blue-500/10 px-2.5 py-1.5 rounded-lg border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
    <Database className="w-3.5 h-3.5" />
    <span className="text-[11px] font-bold uppercase tracking-wider">Synthetic</span>
  </div>
);

export default DataBadge;
