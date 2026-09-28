import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: any[];
}

const LineLoadingChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="line" label={{ value: 'Line ID', position: 'bottom', offset: 0 }} />
          <YAxis domain={[0, 120]} label={{ value: 'Loading (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Limit', position: 'insideTopLeft', fill: '#ef4444' }} />
          <Bar dataKey="loading" name="Loading (%)">
            {data.map((entry, index) => {
              let color = '#10b981'; // green
              if (entry.loading > 100) color = '#ef4444'; // red
              else if (entry.loading > 80) color = '#f59e0b'; // amber
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineLoadingChart;
