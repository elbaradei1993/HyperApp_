import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const geocoding = vi.hoisted(() => ({
  searchPlaces: vi.fn(),
  formatSearchResult: vi.fn((result: { display_name: string }) => result.display_name),
  getCoordinatesFromResult: vi.fn((result: { lat: string; lon: string }) => [Number(result.lat), Number(result.lon)]),
}));

vi.mock('../lib/geocoding', () => geocoding);

import { MapSearchBar } from './MapComponent';

describe('MapSearchBar', () => {
  beforeEach(() => {
    geocoding.searchPlaces.mockResolvedValue([{
      place_id: 'station-1',
      display_name: 'Surrey Central Station, Surrey, BC',
      address: {},
      lat: '49.1896',
      lon: '-122.8479',
      type: 'station',
      importance: 0.8,
      boundingbox: ['0', '0', '0', '0'],
    }]);
  });

  it('searches inline and returns the selected coordinates without opening a modal', async () => {
    const onLocationSelect = vi.fn();
    render(<MapSearchBar onLocationSelect={onLocationSelect} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Search the map' }), {
      target: { value: 'Surrey Central' },
    });
    const result = await screen.findByRole('option', { name: /Surrey Central Station/ });
    fireEvent.click(result);

    expect(onLocationSelect).toHaveBeenCalledWith([49.1896, -122.8479]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
