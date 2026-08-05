import { describe, expect, it } from 'vitest';

import { createVibeMarkerIcon, getVibeMaterialSymbol } from './MapIcons';

describe('map vibe Material Symbols', () => {
  it('maps safety vibes to meaningful Google Material Symbols', () => {
    expect(getVibeMaterialSymbol('safe')).toBe('verified_user');
    expect(getVibeMaterialSymbol('festive')).toBe('celebration');
    expect(getVibeMaterialSymbol('dangerous')).toBe('warning');
  });

  it('uses a neutral location symbol for unknown types', () => {
    expect(getVibeMaterialSymbol('not-a-vibe')).toBe('location_on');
  });

  it('creates a Leaflet marker with the configured symbol and color', () => {
    const icon = createVibeMarkerIcon('quiet', '#06b6d4');
    const html = String(icon.options.html);

    expect(html).toContain('volume_off');
    expect(html).toContain('#06b6d4');
    expect(icon.options.className).toBe('custom-vibe-marker');
  });
});
