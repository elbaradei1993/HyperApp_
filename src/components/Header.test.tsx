import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Header from './Header';

const authMock = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    email: 'person@example.com',
    first_name: 'Alexandria-with-a-very-long-name',
  } as Record<string, unknown> | null,
  isAuthenticated: true,
  isLoading: false,
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key.split('.').at(-1),
  }),
}));

vi.mock('./shared/NotificationBell', () => ({
  default: () => <button type="button" aria-label="Notifications">Notifications</button>,
}));

const defaultProps = {
  activeTab: 'dashboard' as const,
  onTabChange: vi.fn(),
  onNewReport: vi.fn(),
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.user = {
      id: 'user-1',
      email: 'person@example.com',
      first_name: 'Alexandria-with-a-very-long-name',
    };
    authMock.isAuthenticated = true;
    authMock.isLoading = false;
    authMock.signOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('links the logo home, exposes the real navigation, and marks the active tab', () => {
    const onTabChange = vi.fn();
    render(<Header {...defaultProps} activeTab="map" onTabChange={onTabChange} />);

    const logo = screen.getByRole('link', { name: 'HyperApp home' });
    expect(logo).toHaveAttribute('href', '/');
    fireEvent.click(logo);
    expect(onTabChange).toHaveBeenCalledWith('dashboard');

    expect(screen.getAllByRole('button', { name: 'Safety map' })[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('button', { name: 'Community' })[0]).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it('opens the mobile dialog, closes it with Escape, and restores trigger focus', async () => {
    render(<Header {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' });

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes the mobile menu after navigation', () => {
    const onTabChange = vi.fn();
    render(<Header {...defaultProps} onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Navigation' });
    fireEvent.click(dialog.querySelector<HTMLButtonElement>('[aria-current]')!);

    expect(onTabChange).toHaveBeenCalledWith('dashboard');
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument();
  });

  it('prevents duplicate report actions while the first action is pending', () => {
    vi.useFakeTimers();
    const onNewReport = vi.fn();
    render(<Header {...defaultProps} onNewReport={onNewReport} />);
    const reportButton = screen.getByRole('button', { name: 'New report' });

    fireEvent.click(reportButton);
    fireEvent.click(reportButton);

    expect(onNewReport).toHaveBeenCalledTimes(1);
    expect(reportButton).toBeDisabled();
    expect(reportButton).toHaveAttribute('aria-busy', 'true');
  });

  it('shows authenticated account controls and signs out from the account menu', async () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(authMock.signOut).toHaveBeenCalledTimes(1));
  });

  it('shows a sign-in control without exposing authenticated actions when logged out', () => {
    authMock.user = null;
    authMock.isAuthenticated = false;
    const onSignIn = vi.fn();
    render(<Header {...defaultProps} onSignIn={onSignIn} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'New report' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open navigation menu' })).not.toBeInTheDocument();
  });

  it('announces authentication loading without rendering conflicting controls', () => {
    authMock.isLoading = true;
    render(<Header {...defaultProps} />);

    expect(screen.getByRole('status', { name: 'Loading HyperApp' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New report' })).not.toBeInTheDocument();
  });
});
