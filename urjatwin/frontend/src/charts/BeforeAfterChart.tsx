import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  data: any[];
  dataKey1: string;
  dataKey2: string;
  name1: string;
  name2: string;
  yLabel: string;
}

const BeforeAfterChart: React.FC<Props> = ({ data, dataKey1, dataKey2, name1, name2, yLabel }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" />
          <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={dataKey1} name={name1} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey={dataKey2} name={name2} stroke="#0ea5e9" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BeforeAfterChart;
