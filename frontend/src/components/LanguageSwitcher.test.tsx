import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from './LanguageSwitcher';

// Mock i18next
const mockChangeLanguage = jest.fn();
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: mockChangeLanguage,
      language: 'ja',
    },
  }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockChangeLanguage.mockClear();
  });

  it('renders language switcher button', () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('opens menu when button is clicked', () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('language.japanese')).toBeInTheDocument();
    expect(screen.getByText('language.english')).toBeInTheDocument();
  });

  it('changes language when menu item is clicked', () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    const englishMenuItem = screen.getByText('language.english');
    fireEvent.click(englishMenuItem);

    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });
});
