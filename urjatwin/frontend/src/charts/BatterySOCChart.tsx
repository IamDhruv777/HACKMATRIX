import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

interface Props {
  data: any[];
}

const BatterySOCChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" />
          <YAxis domain={[0, 100]} label={{ value: 'SOC (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Min', position: 'insideTopLeft' }} />
          <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Max', position: 'insideBottomLeft' }} />
          <Area type="monotone" dataKey="soc" stroke="#8b5cf6" fill="#c4b5fd" name="State of Charge (%)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BatterySOCChart;
