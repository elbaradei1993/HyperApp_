import React from 'react';
import { useTranslation } from 'react-i18next';

interface PremiumEmptyStateProps {
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
  communityCount?: number;
  recentUsers?: Array<{
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    profile_picture_url: string | null;
  }>;
}

const PremiumEmptyState: React.FC<PremiumEmptyStateProps> = ({
  onPrimaryAction,
  onSecondaryAction,
  communityCount = 0,
  recentUsers = [],
  className = '',
}) => {
  const { t } = useTranslation();

  // Helper function to get user initials
  const getUserInitials = (user: typeof recentUsers[0]) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name.charAt(0).toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return '?';
  };

  // Helper function to get user display name
  const getUserDisplayName = (user: typeof recentUsers[0]) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
      return user.first_name;
    }
    if (user.username) {
      return user.username;
    }
    return 'Anonymous User';
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      ...className && { className },
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}>
        {/* Animated background orbs */}
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '25%',
          width: '256px',
          height: '256px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
          borderRadius: '50%',
          filter: 'blur(48px)',
          animation: 'pulse 3s ease-in-out infinite',
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '25%',
          right: '25%',
          width: '192px',
          height: '192px',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
          borderRadius: '50%',
          filter: 'blur(48px)',
          animation: 'pulse 3s ease-in-out infinite 1s',
        }}></div>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '128px',
          height: '128px',
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          borderRadius: '50%',
          filter: 'blur(32px)',
          animation: 'pulse 3s ease-in-out infinite 0.5s',
        }}></div>
      </div>

      {/* Main Content Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '512px',
      }}>
        <div style={{
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}>
          {/* Hero Icon Section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            <div style={{
              position: 'relative',
              display: 'inline-block',
              marginBottom: '24px',
            }}>
              {/* Main safety shield icon with glow */}
              <div style={{
                width: '96px',
                height: '96px',
                margin: '0 auto 0 auto',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  borderRadius: '16px',
                  boxShadow: '0 16px 32px rgba(59, 130, 246, 0.3), 0 8px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  transform: 'rotate(45deg)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}></div>
                <div style={{
                  position: 'absolute',
                  inset: '4px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  transform: 'rotate(45deg)',
                }}></div>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    color: 'white',
                    fontSize: '36px',
                    fontWeight: 'bold',
                    transform: 'rotate(-45deg)',
                  }}>🛡️</div>
                </div>
              </div>

              {/* Floating particles */}
              <div style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '12px',
                height: '12px',
                background: '#fbbf24',
                borderRadius: '50%',
                animation: 'bounce 2s ease-in-out infinite 0.3s',
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-4px',
                left: '-12px',
                width: '8px',
                height: '8px',
                background: '#10b981',
                borderRadius: '50%',
                animation: 'bounce 2s ease-in-out infinite 0.7s',
              }}></div>
              <div style={{
                position: 'absolute',
                top: '50%',
                right: '-16px',
                transform: 'translateY(-50%)',
                width: '8px',
                height: '8px',
                background: '#3b82f6',
                borderRadius: '50%',
                animation: 'bounce 2s ease-in-out infinite 1s',
              }}></div>
            </div>

            {/* Main Headline */}
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent-primary) 50%, var(--accent-secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '16px',
              lineHeight: '1.2',
              letterSpacing: '-0.02em',
            }}>
              {t('community.emptyState.title', 'Be the First Safety Guardian')}
            </h1>

            {/* Subheadline */}
            <p style={{
              fontSize: '20px',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              fontWeight: '600',
            }}>
              {t('community.emptyState.subtitle', 'Your community needs you')}
            </p>

            {/* Description */}
            <p style={{
              fontSize: '16px',
              color: 'var(--text-muted)',
              maxWidth: '400px',
              margin: '0 auto 32px auto',
              lineHeight: '1.5',
            }}>
              {t('community.emptyState.description',
                'No safety reports in your area yet. Be the first to help create a safer community by sharing real-time safety information with your neighbors.')}
            </p>
          </div>

          {/* Feature Benefits */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}>
            <div style={{
              textAlign: 'center',
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                fontSize: '24px',
                marginBottom: '8px',
              }}>🚨</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '4px',
              }}>
                {t('community.emptyState.benefit1.title', 'Instant Alerts')}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}>
                {t('community.emptyState.benefit1.desc', 'Get notified of safety issues nearby')}
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                fontSize: '24px',
                marginBottom: '8px',
              }}>👥</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '4px',
              }}>
                {t('community.emptyState.benefit2.title', 'Community Power')}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}>
                {t('community.emptyState.benefit2.desc', 'Strengthen your neighborhood together')}
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                fontSize: '24px',
                marginBottom: '8px',
              }}>⭐</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '4px',
              }}>
                {t('community.emptyState.benefit3.title', 'Build Trust')}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}>
                {t('community.emptyState.benefit3.desc', 'Earn reputation as a community leader')}
              </div>
            </div>
          </div>

          {/* Call-to-Action Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
          }}>
            {/* Primary CTA */}
            {onPrimaryAction && (
              <button
                onClick={onPrimaryAction}
                style={{
                  position: 'relative',
                  padding: '18px 36px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '60px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.4), 0 6px 16px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                }}></div>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '20px' }}>📝</span>
                  <span>{t('community.emptyState.primaryCTA', 'Submit First Report')}</span>
                  <span style={{
                    fontSize: '18px',
                    transition: 'transform 0.3s ease',
                  }}>→</span>
                </div>
              </button>
            )}
          </div>

          {/* Social Proof */}
          <div style={{
            textAlign: 'center',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}>
              <div style={{
                display: 'flex',
                gap: '-4px',
              }}>
                {recentUsers.length > 0 ? (
                  recentUsers.slice(0, 4).map((user, index) => (
                    <div
                      key={user.id}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        overflow: 'hidden',
                        position: 'relative',
                        zIndex: 4 - index, // Stack them properly
                        background: user.profile_picture_url
                          ? 'transparent'
                          : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      }}
                      title={getUserDisplayName(user)}
                    >
                      {user.profile_picture_url ? (
                        <img
                          src={user.profile_picture_url}
                          alt={getUserDisplayName(user)}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            // Fallback to initials if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div style="
                                width: 100%;
                                height: 100%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 10px;
                                font-weight: bold;
                                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                              ">${getUserInitials(user)}</div>`;
                            }
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 'bold',
                        }}>
                          {getUserInitials(user)}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  // Fallback to decorative circles if no users
                  <>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                    }}></div>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                    }}></div>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                    }}></div>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #eab308 0%, #f97316 100%)',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                    }}></div>
                  </>
                )}
              </div>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: '500',
              }}>
                {communityCount > 0 ? `+${communityCount.toLocaleString()} communities protected` : 'Be the first in your area'}
              </span>
            </div>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}>
              {t('community.emptyState.socialProof', 'Join thousands of safety-conscious communities worldwide')}
            </p>
          </div>
        </div>

        {/* Bottom decorative elements */}
        <div style={{
          position: 'absolute',
          bottom: '-16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '128px',
          height: '32px',
          background: 'linear-gradient(to top, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
          borderRadius: '50% 50% 0 0',
          filter: 'blur(8px)',
        }}></div>
      </div>
    </div>
  );
};

export default PremiumEmptyState;
