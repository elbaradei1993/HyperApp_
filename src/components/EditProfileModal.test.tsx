import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EditProfileModal from './EditProfileModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn().mockRejectedValue(new Error('Location unavailable in test')),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: (() => {
    const context = {
      user: {
        id: 'user-1',
        email: 'user@example.com',
        first_name: 'Alex',
        last_name: 'Morgan',
        interests: [],
      },
      updateProfile: vi.fn(),
    };
    return () => context;
  })(),
}));

afterEach(() => {
  document.body.style.overflow = '';
});

describe('EditProfileModal', () => {
  it('portals a viewport-sized dialog and closes from Escape', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <ChakraProvider value={defaultSystem}>
        <EditProfileModal isOpen onClose={onClose} />
      </ChakraProvider>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.classList.contains('edit-profile-dialog')).toBe(true);
    expect(dialog.parentElement).toBe(document.body.lastElementChild);
    expect(dialog.querySelector('.edit-profile-dialog__body')).toBeTruthy();
    expect(dialog.querySelector('.edit-profile-dialog__footer')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
