import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { id: 'user-a', email: 'user@example.com' } as { id: string; email: string } | null,
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  storageRemove: vi.fn(),
  limitProfiles: vi.fn(),
  updateLocationSharingPreference: vi.fn(),
}));

vi.mock('./AuthContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('./AuthContext')>();
  return {
    ...original,
    useAuth: () => ({ user: mocks.user }),
  };
});

vi.mock('../lib/storage', () => ({
  storageManager: {
    get: mocks.storageGet,
    set: mocks.storageSet,
    remove: mocks.storageRemove,
  },
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ limit: mocks.limitProfiles })),
      })),
    })),
  },
}));

vi.mock('../services/userLocationService', () => ({
  userLocationService: {
    updateLocationSharingPreference: mocks.updateLocationSharingPreference,
  },
}));

import { requireProfileUpdateData } from './AuthContext';
import {
  buildAuthProfileMetadata,
  buildProfileUpsertPayload,
  mergeAuthIdentity,
  resolveProfileRow,
  sanitizeProfileUpdates,
} from '../services/auth';
import { getLanguageStorageKey, normalizeSupportedLanguage } from './LanguageContext';
import {
  SettingsProvider,
  getSettingsStorageKey,
  useSettings,
} from './SettingsContext';

let currentSettings: ReturnType<typeof useSettings>;

const SettingsProbe: React.FC = () => {
  currentSettings = useSettings();
  return <div data-testid="settings-state">{JSON.stringify(currentSettings.settings)}</div>;
};

describe('profile and settings persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 'user-a', email: 'user@example.com' };
    mocks.storageSet.mockResolvedValue(undefined);
    mocks.storageRemove.mockResolvedValue(undefined);
    mocks.limitProfiles.mockResolvedValue({ data: [{ location_sharing: false }], error: null });
    mocks.updateLocationSharingPreference.mockResolvedValue(true);
  });

  it('uses account-scoped storage keys', () => {
    expect(getSettingsStorageKey('user-a')).toBe('userSettings:user-a');
    expect(getSettingsStorageKey('user-b')).toBe('userSettings:user-b');
    expect(getLanguageStorageKey('user-a')).toBe('language:user-a');
    expect(normalizeSupportedLanguage('ar')).toBe('en');
  });

  it('hydrates local settings and lets the server override durable location sharing', async () => {
    mocks.storageGet.mockImplementation(async (key: string) => (
      key === 'userSettings:user-a'
        ? JSON.stringify({ notifications: false, locationSharing: false })
        : null
    ));
    mocks.limitProfiles.mockResolvedValue({ data: [{ location_sharing: true }], error: null });

    render(
      <SettingsProvider>
        <SettingsProbe />
      </SettingsProvider>,
    );

    await waitFor(() => expect(currentSettings.isLoading).toBe(false));
    expect(currentSettings.settings.notifications).toBe(false);
    expect(currentSettings.settings.locationSharing).toBe(true);
    expect(mocks.storageGet).toHaveBeenCalledWith('userSettings:user-a');
    expect(mocks.storageSet).toHaveBeenCalledWith(
      'userSettings:user-a',
      expect.stringContaining('"locationSharing":true'),
    );
  });

  it('persists a preference update under the current account', async () => {
    mocks.storageGet.mockResolvedValue(JSON.stringify({ notifications: true }));

    render(
      <SettingsProvider>
        <SettingsProbe />
      </SettingsProvider>,
    );
    await waitFor(() => expect(currentSettings.isLoading).toBe(false));

    await act(async () => {
      await currentSettings.updateSettings({ notifications: false });
    });

    expect(currentSettings.settings.notifications).toBe(false);
    expect(mocks.storageSet).toHaveBeenLastCalledWith(
      'userSettings:user-a',
      expect.stringContaining('"notifications":false'),
    );
  });

  it('rolls back location sharing when the durable server write fails', async () => {
    mocks.storageGet.mockResolvedValue(JSON.stringify({ locationSharing: false }));
    mocks.updateLocationSharingPreference.mockResolvedValue(false);

    render(
      <SettingsProvider>
        <SettingsProbe />
      </SettingsProvider>,
    );
    await waitFor(() => expect(currentSettings.isLoading).toBe(false));

    let saveError: unknown;
    await act(async () => {
      try {
        await currentSettings.updateSettings({ locationSharing: true });
      } catch (error) {
        saveError = error;
      }
    });
    expect(saveError).toBeInstanceOf(Error);
    expect((saveError as Error).message).toContain('could not be saved');

    await waitFor(() => {
      expect(currentSettings.settings.locationSharing).toBe(false);
      expect(mocks.storageSet).toHaveBeenLastCalledWith(
        'userSettings:user-a',
        expect.stringContaining('"locationSharing":false'),
      );
    });
  });

  it('rejects failed or empty profile saves instead of presenting them as successful', () => {
    expect(() => requireProfileUpdateData({ error: { message: 'Row update denied' } }))
      .toThrow('Row update denied');
    expect(() => requireProfileUpdateData({ data: null, error: null }))
      .toThrow('not returned by the server');
    expect(requireProfileUpdateData({ data: { first_name: 'Amina' }, error: null }))
      .toEqual({ first_name: 'Amina' });
  });

  it('handles profile query cardinality without PostgREST single-row coercion', () => {
    expect(resolveProfileRow([], 'load', true)).toEqual({ data: null, error: null });

    const missingUpdate = resolveProfileRow([], 'update');
    expect(missingUpdate.data).toBeNull();
    expect(missingUpdate.error?.code).toBe('PROFILE_NOT_FOUND');

    const duplicateUpdate = resolveProfileRow(
      [{ user_id: 'user-a' }, { user_id: 'user-a' }],
      'update',
    );
    expect(duplicateUpdate.data).toBeNull();
    expect(duplicateUpdate.error?.code).toBe('PROFILE_DUPLICATE');

    expect(resolveProfileRow([{ user_id: 'user-a' }], 'update')).toEqual({
      data: { user_id: 'user-a' },
      error: null,
    });
  });

  it('keeps the Supabase Auth ID when a profile row has its own primary key', () => {
    const merged = mergeAuthIdentity(
      {
        id: 'auth-user-id',
        email: 'auth@example.com',
        email_confirmed_at: '2026-08-03T00:00:00.000Z',
      },
      {
        id: 'public-profile-row-id',
        email: 'stale@example.com',
        first_name: 'Amina',
      },
    );

    expect(merged.id).toBe('auth-user-id');
    expect(merged.email).toBe('auth@example.com');
    expect(merged.first_name).toBe('Amina');
  });

  it('builds a safe self-healing profile row without overwriting database identity fields', () => {
    const updates = sanitizeProfileUpdates({
      id: 'client-side-auth-id',
      first_name: 'Amina',
      last_name: 'Khaled',
    });

    expect(updates).toEqual({ first_name: 'Amina', last_name: 'Khaled' });
    expect(buildProfileUpsertPayload('auth-user-id', updates, {
      email: 'amina@example.com',
      username: 'amina',
    })).toEqual(expect.objectContaining({
      user_id: 'auth-user-id',
      email: 'amina@example.com',
      username: 'amina',
      first_name: 'Amina',
      last_name: 'Khaled',
    }));

    expect(buildAuthProfileMetadata({
      first_name: 'Amina',
      reputation: 999,
      verification_level: 'trusted',
    })).toEqual({ first_name: 'Amina' });
  });
});
