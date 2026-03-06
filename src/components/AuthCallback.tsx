import React, { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

import { LoadingSpinner } from './shared';

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Handling auth callback...');

        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Auth callback error:', error);
          setStatus('error');
          setMessage(`Authentication failed: ${error.message}`);
          return;
        }

        if (data.session?.user) {
          console.log('✅ Email confirmed successfully for user:', data.session.user.email);
          setStatus('success');
          setMessage('Email confirmed! Redirecting you to the app...');

          // Redirect to main app after a short delay
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          console.log('⚠️ No active session found');
          setStatus('error');
          setMessage('No active session found. Please try signing up again.');
        }
      } catch (error: any) {
        console.error('❌ Auth callback failed:', error);
        setStatus('error');
        setMessage(`Something went wrong: ${error.message || 'Unknown error'}`);
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '20px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%',
      }}>
        {status === 'loading' && (
          <>
            <LoadingSpinner />
            <h2 style={{
              marginTop: '20px',
              marginBottom: '10px',
              fontSize: '1.5rem',
              fontWeight: '600',
            }}>
              Confirming Your Email
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: '1.5',
            }}>
              {message}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
            }}>
              ✅
            </div>
            <h2 style={{
              marginBottom: '10px',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'var(--success)',
            }}>
              Email Confirmed!
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: '1.5',
            }}>
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
            }}>
              ❌
            </div>
            <h2 style={{
              marginBottom: '10px',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'var(--danger)',
            }}>
              Confirmation Failed
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: '1.5',
              marginBottom: '20px',
            }}>
              {message}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--accent-secondary)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--accent-primary)';
              }}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
