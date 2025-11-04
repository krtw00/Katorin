import React from 'react';
// TODO: Uncomment when recharts is added to dependencies
// import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

// Temporary placeholder until recharts is available
const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div style={{ width: '100%', height: 400, padding: '20px' }}>
      <h2>{t('analytics.title')}</h2>
      <p>Analytics dashboard is under development. Charts will be available soon.</p>
    </div>
  );
};

export default AnalyticsDashboard;
