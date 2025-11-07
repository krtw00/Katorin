import React from 'react';
import { render, screen } from '@testing-library/react';
import LeagueDisplay from './LeagueDisplay';

describe('LeagueDisplay', () => {
  it('renders league standings heading', () => {
    render(<LeagueDisplay />);
    expect(screen.getByText('League Standings')).toBeInTheDocument();
  });

  it('renders team information', () => {
    render(<LeagueDisplay />);
    expect(screen.getByText(/Team Alpha/)).toBeInTheDocument();
    expect(screen.getByText(/Team Beta/)).toBeInTheDocument();
  });

  it('renders player information', () => {
    render(<LeagueDisplay />);
    expect(screen.getByText('Player A')).toBeInTheDocument();
    expect(screen.getByText('Player B')).toBeInTheDocument();
    expect(screen.getByText('Player C')).toBeInTheDocument();
    expect(screen.getByText('Player D')).toBeInTheDocument();
  });

  it('renders deck and match record information', () => {
    render(<LeagueDisplay />);
    expect(screen.getByText('Deck 1')).toBeInTheDocument();
    expect(screen.getByText('3-1')).toBeInTheDocument();
  });
});
