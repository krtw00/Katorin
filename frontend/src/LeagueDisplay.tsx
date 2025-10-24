import React from 'react';

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
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>League Standings</h1>
      {mockLeagueData.map((team, teamIndex) => (
        <div key={teamIndex} style={{ marginBottom: '30px', border: '1px solid #ccc', borderRadius: '5px', padding: '15px' }}>
          <h2 style={{ color: '#333' }}>Team: {team.name} (Record: {team.teamRecord})</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Player</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Deck</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Match Record</th>
              </tr>
            </thead>
            <tbody>
              {team.players.map((player, playerIndex) => (
                <tr key={playerIndex}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.deck}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{player.matchRecord}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default LeagueDisplay;
