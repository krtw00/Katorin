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

  it('renders description', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText(/Analytics dashboard provides insights into match performance and player statistics./i)).toBeInTheDocument();
  });
});
