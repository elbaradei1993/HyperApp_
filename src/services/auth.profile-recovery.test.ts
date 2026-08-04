import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateAuthUser: vi.fn(),
  updateProfile: vi.fn(),
  updateEq: vi.fn(),
  updateSelect: vi.fn(),
  upsertProfile: vi.fn(),
  upsertSelect: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      updateUser: mocks.updateAuthUser,
    },
    from: vi.fn(() => ({
      update: mocks.updateProfile,
      upsert: mocks.upsertProfile,
    })),
  },
}));

import { authService } from './auth';

describe('profile save recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const authUser = {
      id: 'user-a',
      email: 'user@example.com',
      user_metadata: { username: 'existing-user' },
    };

    mocks.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mocks.updateAuthUser.mockResolvedValue({
      data: { user: { ...authUser, user_metadata: { ...authUser.user_metadata, first_name: 'Amina' } } },
      error: null,
    });
    mocks.updateSelect.mockResolvedValue({ data: [], error: null });
    mocks.updateEq.mockReturnValue({ select: mocks.updateSelect });
    mocks.updateProfile.mockReturnValue({ eq: mocks.updateEq });
    mocks.upsertSelect.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'row-level security policy blocked the write' },
    });
    mocks.upsertProfile.mockReturnValue({ select: mocks.upsertSelect });
  });

  it('preserves personal changes in Auth metadata when a missing public profile cannot be repaired', async () => {
    const result = await authService.updateUserProfile('user-a', { first_name: 'Amina' });

    expect(mocks.updateAuthUser).toHaveBeenCalledWith({ data: { first_name: 'Amina' } });
    expect(mocks.upsertProfile).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-a', first_name: 'Amina' }),
      { onConflict: 'user_id' },
    );
    expect(result).toEqual(expect.objectContaining({
      data: { first_name: 'Amina' },
      error: null,
    }));
  });
});
