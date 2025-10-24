import React, { useState } from 'react';

const LeagueInput: React.FC = () => {
  const [teamName, setTeamName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [deck, setDeck] = useState('');
  const [matchRecord, setMatchRecord] = useState('');
  const [teamRecord, setTeamRecord] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // In a real application, you would send this data to a backend or state management
    console.log({
      teamName,
      playerName,
      deck,
      matchRecord,
      teamRecord,
    });
    alert('Data submitted (check console for mock data)');
    // Clear form
    setTeamName('');
    setPlayerName('');
    setDeck('');
    setMatchRecord('');
    setTeamRecord('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>League Data Input</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', maxWidth: '400px', gap: '10px' }}>
        <label>
          Team Name:
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </label>
        <label>
          Player Name:
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </label>
        <label>
          Deck:
          <input
            type="text"
            value={deck}
            onChange={(e) => setDeck(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </label>
        <label>
          Match Record (e.g., 3-1):
          <input
            type="text"
            value={matchRecord}
            onChange={(e) => setMatchRecord(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </label>
        <label>
          Team Record (e.g., 2-0):
          <input
            type="text"
            value={teamRecord}
            onChange={(e) => setTeamRecord(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </label>
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>
          Submit Data
        </button>
      </form>
    </div>
  );
};

export default LeagueInput;
