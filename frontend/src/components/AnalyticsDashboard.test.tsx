import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalyticsDashboard from './AnalyticsDashboard';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('AnalyticsDashboard', () => {
  it('renders analytics title', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText('analytics.title')).toBeInTheDocument();
  });

  it('renders development message', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText(/Analytics dashboard is under development/i)).toBeInTheDocument();
  });
});
