import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ContextBanner from './ContextBanner';

describe('ContextBanner', () => {
  it('renders a calm welcome state with no live-region interruption', () => {
    render(
      <ContextBanner
        id="welcome-title"
        variant="welcome"
        eyebrow="Live overview"
        title="Good evening, Alex"
        description="Your local safety pulse is ready."
      />,
    );

    expect(screen.getByRole('heading', { name: 'Good evening, Alex' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading').closest('.context-banner')).toHaveClass('context-banner--welcome');
  });

  it('supports an active safety-session state without fabricating session data', () => {
    render(
      <ContextBanner
        id="session-title"
        variant="active-session"
        eyebrow="Safety session active"
        title="Check-in due in 8 minutes"
        description="Location sharing is active with your selected contacts."
        detail="Started at 8:20 PM"
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Check-in due in 8 minutes');
    expect(screen.getByText('Started at 8:20 PM')).toBeInTheDocument();
  });

  it('changes status styling and invokes only the supplied real actions', () => {
    const primaryAction = vi.fn();
    const secondaryAction = vi.fn();
    const { rerender } = render(
      <ContextBanner
        id="permission-title"
        variant="permission"
        eyebrow="Location status"
        title="Make the safety map more relevant"
        description="Enable location to see nearby reports."
        primaryAction={{ label: 'Enable location', onClick: primaryAction }}
        secondaryAction={{ label: 'Open map', onClick: secondaryAction }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enable location' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open map' }));
    expect(primaryAction).toHaveBeenCalledTimes(1);
    expect(secondaryAction).toHaveBeenCalledTimes(1);

    rerender(
      <ContextBanner
        id="offline-title"
        variant="offline"
        eyebrow="Connection status"
        title="You are offline"
        description="Live information will return with your connection."
      />,
    );
    expect(screen.getByRole('status')).toHaveClass('context-banner--offline');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
