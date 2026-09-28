import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  message: string;
}

const ErrorCard: React.FC<Props> = ({ message }) => (
  <div className="bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
    <div className="flex items-start">
      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
      <div className="ml-3">
        <h3 className="text-red-300 font-medium">Error</h3>
        <p className="text-sm text-red-600 mt-1">{message}</p>
      </div>
    </div>
  </div>
);

export default ErrorCard;
