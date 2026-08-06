import { render, screen } from '@testing-library/react';
import { Map } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import PageBanner from './PageBanner';

describe('PageBanner', () => {
  it('exposes the tab name as the page heading and keeps actions inside the banner', () => {
    render(
      <PageBanner
        id="map-heading"
        icon={Map}
        tone="blue"
        eyebrow="Live map"
        title="Map"
        description="Explore nearby reports"
        action={<button type="button">Map action</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Map' })).toBeTruthy();
    expect(screen.getByText('Explore nearby reports')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Map action' }).closest('.page-banner')).toBeTruthy();
  });
});
