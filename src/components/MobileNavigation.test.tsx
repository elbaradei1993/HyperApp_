import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MobileNavigation from './MobileNavigation';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key.split('.').at(-1),
  }),
}));

describe('MobileNavigation', () => {
  it('exposes every real primary destination and a separate report action', () => {
    render(
      <MobileNavigation
        activeTab="reports"
        isReportPending={false}
        onNavigate={vi.fn()}
        onNewReport={vi.fn()}
      />,
    );

    const navigation = screen.getByRole('navigation', { name: 'Mobile primary navigation' });
    expect(within(navigation).getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'Safety map' })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'Community' })).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).getByRole('button', { name: 'Account' })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'New report' })).toBeInTheDocument();
    expect(within(navigation).queryByRole('button', { name: /menu/i })).not.toBeInTheDocument();
  });

  it('navigates directly and exposes the report pending state', () => {
    const onNavigate = vi.fn();
    render(
      <MobileNavigation
        activeTab="dashboard"
        isReportPending
        onNavigate={onNavigate}
        onNewReport={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    expect(onNavigate).toHaveBeenCalledWith('settings');
    expect(screen.getByRole('button', { name: 'New report' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'New report' })).toHaveAttribute('aria-busy', 'true');
  });
});
