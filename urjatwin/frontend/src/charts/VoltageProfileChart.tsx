import React from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: any[];
}

const VoltageProfileChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="bus" label={{ value: 'Bus Number', position: 'bottom', offset: 0 }} />
          <YAxis domain={[0.9, 1.1]} label={{ value: 'Voltage (pu)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <ReferenceLine y={0.95} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'V min', position: 'insideTopLeft', fill: '#ef4444' }} />
          <ReferenceLine y={1.05} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'V max', position: 'insideBottomLeft', fill: '#ef4444' }} />
          <Bar dataKey="voltage" name="Voltage (pu)">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={(entry.voltage < 0.95 || entry.voltage > 1.05) ? '#ef4444' : '#10b981'} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VoltageProfileChart;
