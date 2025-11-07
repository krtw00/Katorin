import React from 'react';
import { render, screen } from '@testing-library/react';
import TestPage from './TestPage';

describe('TestPage', () => {
  it('renders test page heading', () => {
    render(<TestPage />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<TestPage />);
    expect(screen.getByText(/This is a simple test page/i)).toBeInTheDocument();
    expect(screen.getByText(/the frontend is working correctly/i)).toBeInTheDocument();
  });
});
