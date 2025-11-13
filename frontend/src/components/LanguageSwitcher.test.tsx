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

  it('opens menu when button is clicked', async () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(await screen.findByText('language.japanese')).toBeInTheDocument();
    expect(await screen.findByText('language.english')).toBeInTheDocument();
  });

  it('changes language when menu item is clicked', async () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    const englishMenuItem = await screen.findByText('language.english');
    fireEvent.click(englishMenuItem);

    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });
});
