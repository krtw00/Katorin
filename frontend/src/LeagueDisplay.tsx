import React from 'react';
import { Card, Table, Typography, Space } from 'antd';

const { Title, Text } = Typography;

interface PlayerStats {
  name: string;
  deck: string;
  matchRecord: string; // e.g., "3-1"
}

interface TeamStats {
  name: string;
  players: PlayerStats[];
  teamRecord: string; // e.g., "2-0"
}

const mockLeagueData: TeamStats[] = [
  {
    name: "Team Alpha",
    players: [
      { name: "Player A", deck: "Deck 1", matchRecord: "3-1" },
      { name: "Player B", deck: "Deck 2", matchRecord: "2-2" },
    ],
    teamRecord: "2-0",
  },
  {
    name: "Team Beta",
    players: [
      { name: "Player C", deck: "Deck 3", matchRecord: "1-3" },
      { name: "Player D", deck: "Deck 4", matchRecord: "2-2" },
    ],
    teamRecord: "1-1",
  },
];

const LeagueDisplay: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>League Standings</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {mockLeagueData.map((team, teamIndex) => (
          <Card
            key={teamIndex}
            title={
              <div>
                <Text strong style={{ fontSize: 18 }}>Team: {team.name}</Text>
                <Text style={{ marginLeft: 16, color: '#666' }}>Record: {team.teamRecord}</Text>
              </div>
            }
            style={{ borderRadius: 8 }}
          >
            <Table
              dataSource={team.players.map((player, idx) => ({
                key: idx,
                ...player,
              }))}
              columns={[
                {
                  title: 'Player',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: 'Deck',
                  dataIndex: 'deck',
                  key: 'deck',
                },
                {
                  title: 'Match Record',
                  dataIndex: 'matchRecord',
                  key: 'matchRecord',
                },
              ]}
              pagination={false}
              size="middle"
            />
          </Card>
        ))}
      </Space>
    </div>
  );
};

export default LeagueDisplay;
