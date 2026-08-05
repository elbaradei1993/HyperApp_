import { describe, expect, it } from 'vitest';

import {
  ensureAppViewportLocked,
  isMapGestureTarget,
  shouldPreventPinchZoom,
} from './zoomGesturePolicy';

describe('zoom gesture policy', () => {
  it('prevents multi-touch page zoom outside the map', () => {
    const page = document.createElement('section');

    expect(shouldPreventPinchZoom(page, 2)).toBe(true);
    expect(shouldPreventPinchZoom(page, 1)).toBe(false);
  });

  it('preserves pinch gestures inside the map', () => {
    const map = document.createElement('div');
    const marker = document.createElement('button');
    map.className = 'map-view-shell';
    map.append(marker);

    expect(isMapGestureTarget(marker)).toBe(true);
    expect(shouldPreventPinchZoom(marker, 2)).toBe(false);
  });

  it('enforces a non-scalable browser viewport', () => {
    document.querySelector('meta[name="viewport"]')?.remove();

    ensureAppViewportLocked();

    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    expect(viewport?.content).toContain('maximum-scale=1');
    expect(viewport?.content).toContain('user-scalable=no');
  });
});
