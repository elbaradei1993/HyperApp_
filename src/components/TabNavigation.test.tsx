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

describe('TabNavigation More menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens from the More button and exposes Profile and Settings', () => {
    render(
      <TabNavigation
        activeTab="dashboard"
        onTabChange={vi.fn()}
        onNewReport={vi.fn()}
      />,
    );

    const moreButton = screen.getByRole('button', { name: 'More' });
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(moreButton);

    expect(moreButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'More' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'profile' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'settings' })).toBeInTheDocument();
  });

  it('selects a menu destination and closes the menu', () => {
    const onTabChange = vi.fn();
    render(
      <TabNavigation
        activeTab="dashboard"
        onTabChange={onTabChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'profile' }));

    expect(onTabChange).toHaveBeenCalledWith('profile');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
