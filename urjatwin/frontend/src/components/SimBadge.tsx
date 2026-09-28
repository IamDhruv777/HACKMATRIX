import React from 'react';
import { Beaker } from 'lucide-react';

const SimBadge = () => (
  <div className="flex items-center space-x-1.5 text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
    <Beaker className="w-3.5 h-3.5" />
    <span className="text-[11px] font-bold uppercase tracking-wider">Simulation</span>
  </div>
);

export default SimBadge;
