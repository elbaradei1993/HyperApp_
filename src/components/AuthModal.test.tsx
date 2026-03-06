import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

import AuthModal from './AuthModal';

// Mock the contexts
const mockUseAuth = vi.fn();
const mockUseNotification = vi.fn();
const mockUseTranslation = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../contexts/NotificationContext', () => ({
  useNotification: () => mockUseNotification(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation(),
}));

// Mock i18next
vi.mock('i18next', () => ({
  default: {
    language: 'en',
  },
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider value={defaultSystem}>
    {children}
  </ChakraProvider>
);

describe('AuthModal', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up default mock implementations
    mockUseAuth.mockReturnValue({
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      resetPassword: vi.fn(),
      isLoading: false,
      updateProfile: vi.fn(),
    });

    mockUseNotification.mockReturnValue({
      addNotification: vi.fn(),
    });

    mockUseTranslation.mockReturnValue({
      t: (key: string) => key, // Return key as translation for simplicity
    });
  });

  it('renders login form by default', () => {
    render(
      <TestWrapper>
        <AuthModal isOpen={true} onClose={() => {}} />
      </TestWrapper>,
    );

    expect(screen.getByText('auth.login')).toBeInTheDocument();
    expect(screen.getByText('auth.signup')).toBeInTheDocument();
    expect(screen.getByText('auth.email')).toBeInTheDocument();
    expect(screen.getByText('auth.password')).toBeInTheDocument();
  });

  it('switches to signup tab when signup button is clicked', () => {
    render(
      <TestWrapper>
        <AuthModal isOpen={true} onClose={() => {}} />
      </TestWrapper>,
    );

    const signupButton = screen.getByText('auth.signup');
    fireEvent.click(signupButton);

    expect(screen.getByText('profile.firstName')).toBeInTheDocument();
    expect(screen.getByText('profile.lastName')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <TestWrapper>
        <AuthModal isOpen={false} onClose={() => {}} />
      </TestWrapper>,
    );

    expect(screen.queryByText('auth.login')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();

    render(
      <TestWrapper>
        <AuthModal isOpen={true} onClose={mockOnClose} />
      </TestWrapper>,
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
