import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center p-8 h-full min-h-[200px]">
    <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-4" />
    <span className="text-slate-400 font-medium">Loading data...</span>
  </div>
);

export default LoadingSpinner;
