import React from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  TrophyOutlined,
  TeamOutlined,
} from '@ant-design/icons';
// TODO: Uncomment when recharts is properly installed and configured
// import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

// Mock data for statistics
const mockStats = {
  totalMatches: 145,
  totalPlayers: 32,
  winRate: 58.6,
  matchesThisWeek: 12,
  change: 8.5,
};

// Mock data for charts (when recharts is available)
// const deckDistribution = [
//   { name: 'Deck A', value: 35 },
//   { name: 'Deck B', value: 28 },
//   { name: 'Deck C', value: 22 },
//   { name: 'Deck D', value: 15 },
// ];
//
// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>{t('analytics.title')}</Title>
      <Paragraph style={{ marginBottom: 24 }}>
        Analytics dashboard provides insights into match performance and player statistics.
      </Paragraph>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="Total Matches"
              value={mockStats.totalMatches}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="Total Players"
              value={mockStats.totalPlayers}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="Win Rate"
              value={mockStats.winRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="Matches This Week"
              value={mockStats.matchesThisWeek}
              prefix={mockStats.change > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix={`(${mockStats.change > 0 ? '+' : ''}${mockStats.change}%)`}
              valueStyle={{ color: mockStats.change > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Deck Distribution"
            bordered={false}
            style={{ borderRadius: 8, minHeight: 400 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 300,
                color: '#999',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Paragraph>Charts will be available when recharts is configured.</Paragraph>
                <Paragraph type="secondary">
                  Pie chart showing deck type distribution across all matches.
                </Paragraph>
              </div>
            </div>
            {/*
            TODO: Uncomment when recharts is available
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deckDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deckDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            */}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Match Performance Trend"
            bordered={false}
            style={{ borderRadius: 8, minHeight: 400 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 300,
                color: '#999',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Paragraph>Charts will be available when recharts is configured.</Paragraph>
                <Paragraph type="secondary">
                  Bar chart showing match win/loss trends over time.
                </Paragraph>
              </div>
            </div>
            {/*
            TODO: Uncomment when recharts is available
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={matchTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="wins" fill="#52c41a" />
                <Bar dataKey="losses" fill="#f5222d" />
              </BarChart>
            </ResponsiveContainer>
            */}
          </Card>
        </Col>
      </Row>

      {/* Additional Info Section */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card
            title="Recent Activity"
            bordered={false}
            style={{ borderRadius: 8 }}
          >
            <Paragraph>
              Recent match activity and player statistics will be displayed here when data is available.
            </Paragraph>
            <Paragraph type="secondary">
              This section will show the latest match results, top performing players, and trending decks.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsDashboard;
