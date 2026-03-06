import React, { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { VIBE_CONFIG, VibeType } from '../constants/vibes';

interface VibePulseCardProps {
  localCurrentLocationVibe: {
    type: string;
    percentage: number;
    count: number;
  } | null;
  currentLocationVibeDistribution: Array<{
    type: string;
    percentage: number;
    count: number;
    color: string;
  }>;
  isGeocoding: boolean;
}

const VibePulseCard: React.FC<VibePulseCardProps> = memo(({
  localCurrentLocationVibe,
  currentLocationVibeDistribution,
  isGeocoding,
}) => {
  const { t } = useTranslation();

  // Memoize vibe color and icon maps for performance
  const vibeColorMap = useMemo(() => VIBE_CONFIG, []);
  const vibeIconMap = useMemo(() => {
    const iconMap: Record<VibeType, string> = {
      safe: '🛡️',
      calm: '😌',
      lively: '🎉',
      festive: '🎊',
      crowded: '👥',
      suspicious: '⚠️',
      dangerous: '🚨',
      noisy: '🔊',
      quiet: '🤫',
      unknown: '❓',
    };
    return iconMap;
  }, []);

  const getVibeColor = (vibeType: string): string => {
    return vibeColorMap[vibeType as VibeType]?.color || '#6b7280';
  };

  const getVibeIconComponent = (vibeType: string) => {
    switch (vibeType) {
    case 'safe':
      return '🛡️';
    case 'calm':
      return '😌';
    case 'lively':
      return '🎉';
    case 'festive':
      return '🎊';
    case 'crowded':
      return '👥';
    case 'suspicious':
      return '⚠️';
    case 'dangerous':
      return '🚨';
    case 'noisy':
      return '🔊';
    case 'quiet':
      return '🤫';
    default:
      return '🛡️';
    }
  };

  if (isGeocoding) {
    return (
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          color: '#64748b',
          fontSize: '16px',
          fontWeight: '600',
          marginTop: '16px',
          position: 'relative',
          zIndex: 1,
        }}>
          Analyzing community vibe...
        </div>
      </div>
    );
  }

  if (!localCurrentLocationVibe) {
    return (
      <div style={{
        padding: '32px',
        background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
        border: '2px solid #e5e7eb',
        borderRadius: '16px',
        textAlign: 'center',
      }}>
        <i className="fas fa-chart-bar" style={{ fontSize: '24px', color: '#9ca3af', marginBottom: '8px' }}></i>
        <div style={{ color: '#6b7280', fontSize: '16px', fontWeight: '500' }}>
          No Community Reports In Your Area Yet
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${getVibeColor(localCurrentLocationVibe.type)}08 0%, ${getVibeColor(localCurrentLocationVibe.type)}04 100%)`,
      border: `1px solid ${getVibeColor(localCurrentLocationVibe.type)}20`,
      borderRadius: '20px',
      padding: '28px 24px',
      marginTop: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '120px',
        height: '120px',
        background: `radial-gradient(circle, ${getVibeColor(localCurrentLocationVibe.type)}10 0%, transparent 70%)`,
        borderRadius: '50%',
        transform: 'translate(40px, -40px)',
      }}></div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '1.5rem' }}>
              {getVibeIconComponent(localCurrentLocationVibe.type)}
            </span>
            {t(`vibes.${localCurrentLocationVibe.type}`, localCurrentLocationVibe.type)} Atmosphere
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          {/* Premium Circular Progress Chart */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}>
            <div style={{
              position: 'relative',
              borderRadius: '50%',
              filter: 'drop-shadow(0 8px 32px rgba(0, 0, 0, 0.12))',
            }}>
              {/* Premium Background Glow */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${getVibeColor(localCurrentLocationVibe.type)}15 0%, ${getVibeColor(localCurrentLocationVibe.type)}08 40%, transparent 70%)`,
                animation: 'premiumGlow 3s ease-in-out infinite',
                zIndex: -1,
              }}></div>

              {/* Sophisticated Pulsing Rings */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                border: `1.5px solid ${getVibeColor(localCurrentLocationVibe.type)}60`,
                boxShadow: `0 0 20px ${getVibeColor(localCurrentLocationVibe.type)}40, inset 0 0 20px ${getVibeColor(localCurrentLocationVibe.type)}20`,
                animation: 'premiumPulse1 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite',
                zIndex: 0,
              }}></div>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '165px',
                height: '165px',
                borderRadius: '50%',
                border: `1px solid ${getVibeColor(localCurrentLocationVibe.type)}45`,
                boxShadow: `0 0 15px ${getVibeColor(localCurrentLocationVibe.type)}30`,
                animation: 'premiumPulse2 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite 0.8s',
                zIndex: 0,
              }}></div>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '190px',
                height: '190px',
                borderRadius: '50%',
                border: `0.8px solid ${getVibeColor(localCurrentLocationVibe.type)}30`,
                boxShadow: `0 0 10px ${getVibeColor(localCurrentLocationVibe.type)}20`,
                animation: 'premiumPulse3 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite 1.6s',
                zIndex: 0,
              }}></div>

              {/* Metallic Particles Effect */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '220px',
                height: '220px',
                zIndex: -1,
              }}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: '3px',
                    height: '3px',
                    background: `linear-gradient(45deg, ${getVibeColor(localCurrentLocationVibe.type)}80, ${getVibeColor(localCurrentLocationVibe.type)}40)`,
                    borderRadius: '50%',
                    boxShadow: `0 0 6px ${getVibeColor(localCurrentLocationVibe.type)}60`,
                    top: `${50 + 35 * Math.sin((i * 45) * Math.PI / 180)}%`,
                    left: `${50 + 35 * Math.cos((i * 45) * Math.PI / 180)}%`,
                    animation: `particleFloat 4s ease-in-out infinite ${i * 0.5}s`,
                    opacity: 0.7,
                  }}></div>
                ))}
              </div>

              {/* Premium Chart Container */}
              <div style={{
                position: 'relative',
                zIndex: 2,
                filter: 'drop-shadow(0 4px 16px rgba(0, 0, 0, 0.15))',
              }}>
                <div style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  background: `conic-gradient(${getVibeColor(localCurrentLocationVibe.type)} ${localCurrentLocationVibe.percentage}%, #f3f4f6 ${localCurrentLocationVibe.percentage}%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  {/* Center Content */}
                  <div style={{
                    textAlign: 'center',
                    position: 'relative',
                  }}>
                    {/* Premium Center Glow */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${getVibeColor(localCurrentLocationVibe.type)}20 0%, transparent 70%)`,
                      animation: 'centerGlow 3s ease-in-out infinite',
                      zIndex: -1,
                    }}></div>

                    <div style={{
                      fontSize: '2.25rem',
                      fontWeight: '900',
                      lineHeight: 1,
                      marginBottom: '4px',
                      background: `linear-gradient(135deg, ${getVibeColor(localCurrentLocationVibe.type)} 0%, ${getVibeColor(localCurrentLocationVibe.type)}dd 50%, ${getVibeColor(localCurrentLocationVibe.type)}aa 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textShadow: `0 2px 8px ${getVibeColor(localCurrentLocationVibe.type)}40`,
                      animation: 'textGlow 2s ease-in-out infinite alternate',
                    }}>
                      {localCurrentLocationVibe.percentage}%
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      color: `${getVibeColor(localCurrentLocationVibe.type)}ee`,
                      textShadow: `0 1px 3px ${getVibeColor(localCurrentLocationVibe.type)}30`,
                      animation: 'textPulse 2s ease-in-out infinite alternate',
                    }}>
                      {t(`vibes.${localCurrentLocationVibe.type}`, localCurrentLocationVibe.type)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Label */}
            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              marginTop: '20px',
            }}>
              <div style={{
                color: '#64748b',
                fontSize: '0.875rem',
                fontWeight: '600',
                letterSpacing: '0.02em',
              }}>
                {t('community.sentimentDistribution')}
              </div>
            </div>
          </div>

          {/* Vibe Description */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'left',
          }}>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '800',
              color: getVibeColor(localCurrentLocationVibe.type),
              marginBottom: '8px',
            }}>
              {t(`vibes.${localCurrentLocationVibe.type}`, localCurrentLocationVibe.type)}
            </div>
            <div style={{
              color: '#64748b',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}>
              {t(`vibes.${localCurrentLocationVibe.type}Desc`, `${localCurrentLocationVibe.type} atmosphere description`)}
            </div>
          </div>
        </div>
      </div>

      {/* Premium CSS Animations */}
      <style>
        {`
          /* Premium Pulsing Rings */
          @keyframes premiumPulse1 {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.8;
              filter: blur(0px);
            }
            50% {
              transform: translate(-50%, -50%) scale(1.15);
              opacity: 0.4;
              filter: blur(1px);
            }
          }
          @keyframes premiumPulse2 {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.6;
              filter: blur(0px);
            }
            50% {
              transform: translate(-50%, -50%) scale(1.25);
              opacity: 0.3;
              filter: blur(1px);
            }
          }
          @keyframes premiumPulse3 {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.4;
              filter: blur(0px);
            }
            50% {
              transform: translate(-50%, -50%) scale(1.35);
              opacity: 0.2;
              filter: blur(1px);
            }
          }

          /* Premium Background Glow */
          @keyframes premiumGlow {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.3;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.1);
              opacity: 0.6;
            }
          }

          /* Center Content Glow */
          @keyframes centerGlow {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.4;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 0.8;
            }
          }

          /* Text Glow Effects */
          @keyframes textGlow {
            0%, 100% {
              text-shadow: 0 2px 8px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2);
            }
            50% {
              text-shadow: 0 2px 12px rgba(16, 185, 129, 0.6), 0 0 30px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.2);
            }
          }

          @keyframes textPulse {
            0%, 100% {
              opacity: 0.9;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(1.02);
            }
          }

          /* Metallic Particles */
          @keyframes particleFloat {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
              opacity: 0.7;
            }
            25% {
              transform: translateY(-8px) rotate(90deg);
              opacity: 1;
            }
            50% {
              transform: translateY(-4px) rotate(180deg);
              opacity: 0.8;
            }
            75% {
              transform: translateY(-12px) rotate(270deg);
              opacity: 0.9;
            }
          }
        `}
      </style>
    </div>
  );
});

VibePulseCard.displayName = 'VibePulseCard';

export default VibePulseCard;
