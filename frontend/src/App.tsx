import React, { useState } from 'react';
import { CssBaseline } from '@mui/material';
import MatchManager from './MatchManager';
import ResultEntry from './ResultEntry';

const App: React.FC = () => {
  const [view, setView] = useState<'manager' | 'result'>('manager');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleOpenResult = (matchId: string) => {
    setSelectedMatchId(matchId);
    setView('result');
  };

  const handleBackToManager = () => {
    setView('manager');
    setSelectedMatchId(null);
  };

  const handleResultSaved = () => {
    setReloadToken((prev) => prev + 1);
  };

  return (
    <>
      <CssBaseline />
      {view === 'manager' ? (
        <MatchManager onOpenResultEntry={handleOpenResult} reloadToken={reloadToken} />
      ) : (
        <ResultEntry matchId={selectedMatchId} onBack={handleBackToManager} onSaved={handleResultSaved} />
      )}
    </>
  );
};

export default App;
