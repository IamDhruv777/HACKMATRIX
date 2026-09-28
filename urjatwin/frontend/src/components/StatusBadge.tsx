import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  status: 'good' | 'warning' | 'critical' | 'unknown';
  text: string;
}

const StatusBadge: React.FC<Props> = ({ status, text }) => {
  const styles = {
    good: 'bg-green-100 text-green-300 border-green-200',
    warning: 'bg-amber-100 text-amber-300 border-amber-200',
    critical: 'bg-red-100 text-red-300 border-red-200',
    unknown: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const icons = {
    good: <CheckCircle className="w-4 h-4 mr-1.5" />,
    warning: <AlertTriangle className="w-4 h-4 mr-1.5" />,
    critical: <XCircle className="w-4 h-4 mr-1.5" />,
    unknown: null,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {icons[status]}
      {text}
    </span>
  );
};

export default StatusBadge;
