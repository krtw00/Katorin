import React, { useState } from 'react';
import './App.css';
import LeagueDisplay from './LeagueDisplay';
import LeagueInput from './LeagueInput';

function App() {
  const [view, setView] = useState('display'); // 'display' or 'input'

  return (
    <div className="App">
      <header className="App-header">
        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => setView('display')} style={{ marginRight: '10px', padding: '10px 20px' }}>
            View League Standings
          </button>
          <button onClick={() => setView('input')} style={{ padding: '10px 20px' }}>
            Input League Data
          </button>
        </div>
        {view === 'display' ? <LeagueDisplay /> : <LeagueInput />}
      </header>
    </div>
  );
}

export default App;
