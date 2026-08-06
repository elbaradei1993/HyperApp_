import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TabNavigation from './TabNavigation';

const i18nMock = vi.hoisted(() => ({
  language: 'en',
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock('../i18n', () => ({ default: i18nMock }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key.split('.').at(-1),
  }),
}));

describe('TabNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes Account as a stable top-level destination without a More menu', () => {
    render(
      <TabNavigation
        activeTab="dashboard"
        onTabChange={vi.fn()}
        onNewReport={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
    const createButton = screen.getByRole('button', { name: 'New report' });
    expect(createButton).toBeInTheDocument();
    expect(createButton.querySelector('.tab-navigation__create-icon')).toBeInTheDocument();
  });

  it('navigates directly to the merged account view', () => {
    const onTabChange = vi.fn();
    render(<TabNavigation activeTab="dashboard" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Account' }));

    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith('settings');
  });
});
