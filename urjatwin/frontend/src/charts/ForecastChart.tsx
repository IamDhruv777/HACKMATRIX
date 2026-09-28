import React from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Props {
  data: any[];
  issueTime?: string;
}

const ForecastChart: React.FC<Props> = ({ data, issueTime }) => {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" />
          <YAxis label={{ value: 'MW', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          {issueTime && <ReferenceLine x={issueTime} stroke="#94a3b8" label={{ value: 'Now', position: 'top' }} />}
          <Area type="monotone" dataKey="uncertainty" fill="#f1f5f9" stroke="none" name="Uncertainty Band" />
          <Line type="monotone" dataKey="actual" name="Actual" stroke="#334155" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#0ea5e9" strokeDasharray="5 5" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ForecastChart;
