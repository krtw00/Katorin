import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

const dummyData = [
  { name: 'Win', value: 10 },
  { name: 'Loss', value: 5 },
  { name: 'Draw', value: 2 },
];

const COLORS = ['#0088FE', '#FF8042', '#FFBB28'];

const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div style={{ width: '100%', height: 400 }}>
      <h2>{t('analytics.title')}</h2>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={dummyData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {dummyData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsDashboard;
