import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  data: any[];
}

const DemandSolarChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#64748b' }} tickMargin={10} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} label={{ value: 'MW', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line type="monotone" dataKey="demand" name="Total Demand" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="available_pv" name="Available PV" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          <Line type="monotone" dataKey="actual_pv" name="Actual PV" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="battery_power" name="Battery Power" stroke="#8b5cf6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DemandSolarChart;
