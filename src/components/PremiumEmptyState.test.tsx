import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PremiumEmptyState from './PremiumEmptyState';

describe('PremiumEmptyState', () => {
  it('renders the restrained safety overview and submits the first report', () => {
    const onPrimaryAction = vi.fn();

    render(
      <PremiumEmptyState
        communityCount={12}
        recentUsers={[]}
        onPrimaryAction={onPrimaryAction}
      />,
    );

    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });
});
