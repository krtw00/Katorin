
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DuelForm } from './duelDefaults';
import { useAuthorizedFetch } from './auth/useAuthorizedFetch';

type RosterEntry = {
  primary: string;
  secondary: string;
};

type MatchEntry = {
  leftPlayer: string;
  leftDeck: string;
  score: string;
  rightDeck: string;
  rightPlayer: string;
};

const parseRoster = (raw: string): RosterEntry[] =>
  raw
    .split('\n')
    .map((line) => {
      const [primary = '', secondary = ''] = line.split(',').map((part) => part.trim());
      return { primary, secondary };
    })
    .filter((entry) => entry.primary || entry.secondary);

const parseMatches = (raw: string): MatchEntry[] =>
  raw.split('\n').map((line) => {
    if (line.trim().length === 0) {
      return {
        leftPlayer: '-',
        leftDeck: '-',
        score: '-',
        rightDeck: '-',
        rightPlayer: '-',
      };
    }
    const [leftPlayer = '-', leftDeck = '-', score = '-', rightDeck = '-', rightPlayer = '-'] = line
      .split(',')
      .map((part) => (part.trim().length === 0 ? '-' : part.trim()));
    return { leftPlayer, leftDeck, score, rightDeck, rightPlayer };
  });

type DuelProps = {
  form: DuelForm;
};

const Duel: React.FC<DuelProps> = ({ form }) => {
  const authFetch = useAuthorizedFetch();
  const fallbackMatches = useMemo(() => parseMatches(form.matchesText), [form.matchesText]);
  const [matchRows, setMatchRows] = useState<MatchEntry[]>(fallbackMatches);
  const displayDate = useMemo(() => {
    const [year, month, day] = form.date.split('-');
    if (year && month && day) {
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      return `${year}/${paddedMonth}/${paddedDay}`;
    }
    return form.date;
  }, [form.date]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await authFetch('/api/matches');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: Array<{
          player?: string;
          deck?: string;
          selfScore?: string | number | null;
          opponentScore?: string | number | null;
          opponentDeck?: string;
          opponentPlayer?: string;
        }> = await response.json();
        const normalized = data.map<MatchEntry>((match) => {
          const leftPlayer = match.player?.trim() || '-';
          const leftDeck = match.deck?.trim() || '-';
          const rightPlayer = match.opponentPlayer?.trim() || '-';
          const rightDeck = match.opponentDeck?.trim() || '-';

          const leftScore = match.selfScore ?? '';
          const rightScore = match.opponentScore ?? '';
          const score =
            leftScore !== '' && rightScore !== ''
              ? `${leftScore} - ${rightScore}`
              : '-';

          return {
            leftPlayer,
            leftDeck,
            score,
            rightDeck,
            rightPlayer,
          };
        });
        setMatchRows(normalized.length > 0 ? normalized : fallbackMatches);
      } catch (error) {
        console.error('Error fetching matches:', error);
      }
    };

    fetchMatches();
  }, [authFetch, fallbackMatches]);

  const leftRoster = useMemo(() => parseRoster(form.leftRosterText), [form.leftRosterText]);
  const rightRoster = useMemo(() => parseRoster(form.rightRosterText), [form.rightRosterText]);
  const filteredMatchRows = useMemo(
    () =>
      matchRows.filter(
        (match) =>
          !(
            match.leftPlayer === '-' &&
            match.leftDeck === '-' &&
            match.score === '-' &&
            match.rightDeck === '-' &&
            match.rightPlayer === '-'
          )
      ),
    [matchRows]
  );
  const { leftWins, rightWins } = useMemo(() => {
    return filteredMatchRows.reduce(
      (acc, match) => {
        const [leftScoreRaw = '0', rightScoreRaw = '0'] = match.score.split('-').map((value) => value.trim());
        const leftScore = Number(leftScoreRaw);
        const rightScore = Number(rightScoreRaw);

        if (!Number.isNaN(leftScore) && !Number.isNaN(rightScore)) {
          if (leftScore > rightScore) {
            acc.leftWins += 1;
          } else if (rightScore > leftScore) {
            acc.rightWins += 1;
          }
        }

        return acc;
      },
      { leftWins: 0, rightWins: 0 }
    );
  }, [filteredMatchRows]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          borderRadius: 3,
          p: { xs: 3, md: 4 },
          background: 'linear-gradient(180deg, #efefef 0%, #d7d7d7 100%)',
          border: '4px solid #6f6f6f',
          color: '#0f0f0f',
          fontFamily: `'Segoe UI', 'Noto Sans JP', sans-serif`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '4px solid #b3b3b3',
            pb: 2,
            mb: 3,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, letterSpacing: '0.12em', lineHeight: 1.1 }}
            >
              {form.title}
            </Typography>
            <Typography
              sx={{
                fontWeight: 600,
                letterSpacing: '0.32em',
                color: '#1f3f92',
                fontSize: 16,
              }}
            >
              {form.subtitle}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right', fontWeight: 600, color: '#333' }}>
            <Typography sx={{ fontSize: 18 }}>{form.stage}</Typography>
            <Typography sx={{ fontSize: 16, mt: 0.5 }}>{displayDate}</Typography>
          </Box>
        </Box>

        <Grid container spacing={2} alignItems="stretch">
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                height: '100%',
                borderRadius: 2.5,
                overflow: 'hidden',
                border: '3px solid rgba(0,0,0,0.2)',
              }}
            >
              <Box
                sx={{
                  bgcolor: '#4b7edb',
                  color: '#fff',
                  px: 2,
                  py: 1.5,
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {form.leftTeamName}
              </Box>
              <Table
                size="small"
                sx={{
                  '& td': {
                    bgcolor: 'rgba(75, 126, 219, 0.86)',
                    color: '#fff',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    px: 2,
                    py: 1.2,
                  },
                }}
              >
                <TableBody>
                  {leftRoster.map((entry, index) => (
                    <TableRow key={`left-${index}`}>
                      <TableCell>{entry.primary || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                color: '#333',
                textShadow: '0 4px 6px rgba(0,0,0,0.25)',
                letterSpacing: '0.08em',
              }}
            >
              VS
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                height: '100%',
                borderRadius: 2.5,
                overflow: 'hidden',
                border: '3px solid rgba(0,0,0,0.2)',
              }}
            >
              <Box
                sx={{
                  bgcolor: '#c92f2f',
                  color: '#fff',
                  px: 2,
                  py: 1.5,
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {form.rightTeamName}
              </Box>
              <Table
                size="small"
                sx={{
                  '& td': {
                    bgcolor: 'rgba(201, 47, 47, 0.86)',
                    color: '#fff',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(255,255,255,0.25)',
                    px: 2,
                    py: 1.2,
                  },
                  '& tr': { '&td:first-of-type': { textAlign: 'right' } },
                }}
              >
                <TableBody>
                  {rightRoster.map((entry, index) => (
                    <TableRow key={`right-${index}`}>
                      <TableCell>{entry.primary || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>

        <Paper
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: 2.5,
            overflow: 'hidden',
            border: '3px solid #777',
            backgroundColor: '#d0d0d0',
          }}
        >
          <Table
            sx={{
              '& th': {
                bgcolor: '#555',
                color: '#f5f5f5',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: 14,
                px: 1.5,
                py: 1.2,
              },
              '& td': {
                textAlign: 'center',
                px: 1.5,
                py: 1.2,
                borderBottom: '1px solid rgba(0,0,0,0.2)',
                fontSize: 15,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>PLAYER</TableCell>
                <TableCell>DECK</TableCell>
                <TableCell></TableCell>
                  <TableCell>DECK</TableCell>
                <TableCell>PLAYER</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMatchRows.map((match, index) => (
                <TableRow key={`match-${index}`}>
                  <TableCell
                    sx={{
                      bgcolor: 'rgba(41,112,224,0.95)',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  >
                    {match.leftPlayer}
                  </TableCell>
                  <TableCell sx={{ bgcolor: 'rgba(41,112,224,0.95)', color: '#fff' }}>
                    {match.leftDeck}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: '#f1f1f1',
                      fontWeight: 700,
                      fontSize: 18,
                      color: '#272727',
                    }}
                  >
                    {match.score}
                  </TableCell>
                  <TableCell sx={{ bgcolor: 'rgba(226,58,58,0.95)', color: '#fff' }}>
                    {match.rightDeck}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: 'rgba(226,58,58,0.95)',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  >
                    {match.rightPlayer}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box
            sx={{
              bgcolor: '#505050',
              color: '#fff',
              textAlign: 'center',
              py: 1.2,
              fontWeight: 700,
              letterSpacing: '0.3em',
            }}
          >
            {leftWins} - {rightWins}
          </Box>
        </Paper>

        <Grid container spacing={2} sx={{ mt: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                bgcolor: '#1a59d9',
                color: '#fff',
                borderRadius: 2,
                textAlign: 'center',
                py: 2,
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: '0.3em',
                boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.25)',
              }}
            >
              {form.winLabel}
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                bgcolor: '#d12c2c',
                color: '#fff',
                borderRadius: 2,
                textAlign: 'center',
                py: 2,
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: '0.3em',
                boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.25)',
              }}
            >
              {form.loseLabel}
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Duel;
