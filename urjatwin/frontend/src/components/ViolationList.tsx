import React from 'react';
import { Violation } from '../types';
import StatusBadge from './StatusBadge';
import { formatNumber } from '../utils/format';

interface Props {
  violations: Violation[];
}

const ViolationList: React.FC<Props> = ({ violations }) => {
  if (violations.length === 0) {
    return (
      <div className="p-4 bg-green-900/20 rounded-lg border border-green-100 flex items-center">
        <StatusBadge status="good" text="No Violations" />
        <span className="ml-3 text-sm text-green-700">Grid is operating within safe limits.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {violations.map((v, i) => (
        <div key={i} className={`p-4 rounded-lg border flex flex-col space-y-2 ${v.severity === 'critical' ? 'bg-red-900/20 border-red-100' : 'bg-amber-900/20 border-amber-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusBadge status={v.severity} text={v.type.replace('_', ' ').toUpperCase()} />
              <span className="font-medium text-slate-100">Element: {v.element_id}</span>
            </div>
            <span className="text-sm font-mono bg-slate-900/60 backdrop-blur-md px-2 py-1 rounded shadow-lg shadow-black/20">
              {formatNumber(v.actual_value)} / {formatNumber(v.limit)} {v.unit}
            </span>
          </div>
          <p className="text-sm text-slate-300">{v.explanation}</p>
        </div>
      ))}
    </div>
  );
};

export default ViolationList;
