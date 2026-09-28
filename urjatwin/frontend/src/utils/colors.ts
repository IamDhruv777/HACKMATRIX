export const getStatusColor = (status: 'good' | 'warning' | 'critical' | 'unknown') => {
  switch (status) {
    case 'good': return 'text-status-good bg-green-100';
    case 'warning': return 'text-status-warning bg-amber-100';
    case 'critical': return 'text-status-critical bg-red-100';
    default: return 'text-status-unknown bg-gray-100';
  }
};
