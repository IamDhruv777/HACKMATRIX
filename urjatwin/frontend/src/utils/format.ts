export const formatNumber = (num: number, decimals: number = 2): string => {
  if (num === null || num === undefined) return '-';
  return num.toFixed(decimals);
};

export const formatPercent = (num: number, decimals: number = 1): string => {
  if (num === null || num === undefined) return '-';
  return `${num.toFixed(decimals)}%`;
};
