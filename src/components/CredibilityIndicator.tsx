import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Shield, Crown } from 'lucide-react';

import { credibilityService } from '../services/credibilityService';

// Simple toast function
const showToast = (message: string) => {
  // Create toast element
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    max-width: 300px;
    text-align: center;
    word-wrap: break-word;
  `;

  document.body.appendChild(toast);

  // Show toast
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // Hide and remove toast
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
};

interface CredibilityIndicatorProps {
  score: number;
  validationCount?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  onClick?: () => void;
}

export const CredibilityIndicator: React.FC<CredibilityIndicatorProps> = ({
  score,
  validationCount = 0,
  size = 'xs', // Changed default to 'xs' for mobile
  showDetails = false,
  onClick,
}) => {
  const { t } = useTranslation();
  const credibilityInfo = credibilityService.getCredibilityLevel(score);
  const percentage = Math.round(score * 100);

  // Translate credibility labels
  const translatedLabel = score >= 0.8 ? t('credibility.highlyCredible') :
    score >= 0.6 ? t('credibility.moderatelyCredible') :
      t('credibility.lowCredibility');

  // Mobile-responsive sizing
  const isMobile = window.innerWidth < 480;
  const getMobileSize = () => {
    if (isMobile) {
      return {
        padding: '1px 3px',
        fontSize: '0.5rem',
        gap: '2px',
      };
    }
    return {
      padding: '2px 6px',
      fontSize: '0.6rem',
      gap: '4px',
    };
  };

  const mobileSize = getMobileSize();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default toast behavior
      showToast(t('credibility.toastMessage', '{{level}} credibility based on community validation', { level: credibilityInfo.label }));
    }
  };

  return (
    <span
      onClick={handleClick}
      style={{
        ...mobileSize,
        borderRadius: '4px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: credibilityInfo.color + '20',
        color: credibilityInfo.color,
        border: `1px solid ${credibilityInfo.color}40`,
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = `0 2px 8px ${credibilityInfo.color}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {credibilityInfo.icon}
      {translatedLabel}
      {validationCount > 0 && (
        <span style={{
          fontSize: isMobile ? '0.4rem' : '0.5rem',
          opacity: 0.8,
          fontWeight: '600',
        }}>
          ({validationCount})
        </span>
      )}
    </span>
  );
};

interface ValidationButtonsProps {
  reportId: number;
  userValidation: 'confirm' | 'deny' | null;
  onValidate: (validationType: 'confirm' | 'deny') => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  isAuthenticated?: boolean;
  isValidating?: boolean;
  userVerificationLevel?: 'basic' | 'verified' | 'trusted';
}

export const ValidationButtons: React.FC<ValidationButtonsProps> = ({
  reportId,
  userValidation,
  onValidate,
  disabled = false,
  size = 'md',
  isAuthenticated = true,
  isValidating = false,
  userVerificationLevel = 'basic',
}) => {
  const { t } = useTranslation();
  const isDisabled = disabled || !isAuthenticated || isValidating;

  // Very small size styles for all screen sizes
  const getSizeStyles = () => {
    if (size === 'sm') {
      return {
        padding: '2px 4px',
        fontSize: '9px',
        emojiSize: '10px',
      };
    }
    return {
      padding: '3px 6px',
      fontSize: '10px',
      emojiSize: '12px',
    };
  };

  const sizeStyles = getSizeStyles();

  const baseButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px', // Minimal gap for professional look
    borderRadius: '8px', // More refined radius
    fontWeight: '500', // Less bold for minimalistic feel
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', // Smoother transition
    border: '1px solid transparent',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.4 : 1,
    fontFamily: 'inherit',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textAlign: 'center' as const,
    minHeight: '28px', // Slightly smaller for minimalism
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    ...sizeStyles,
  };

  const confirmButtonStyle = userValidation === 'confirm'
    ? {
      ...baseButtonStyle,
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      boxShadow: '0 2px 12px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    }
    : {
      ...baseButtonStyle,
      background: 'rgba(255, 255, 255, 0.05)',
      color: 'var(--text-secondary)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    };

  const denyButtonStyle = userValidation === 'deny'
    ? {
      ...baseButtonStyle,
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      boxShadow: '0 2px 12px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    }
    : {
      ...baseButtonStyle,
      background: 'rgba(239, 68, 68, 0.08)', // Subtle red background when not pressed
      color: '#dc2626', // Red text color
      borderColor: 'rgba(239, 68, 68, 0.2)', // Subtle red border
      boxShadow: '0 1px 3px rgba(239, 68, 68, 0.1)', // Subtle red shadow
    };

  const handleValidation = (type: 'confirm' | 'deny') => {
    if (isDisabled) {
      return;
    }

    if (!isAuthenticated) {
      showToast(t('credibility.loginRequired'));
      return;
    }

    console.log(`ValidationButtons: ${type} clicked for report`, reportId, 'by user level:', userVerificationLevel);
    onValidate(type);
  };

  // Responsive container style - always side by side
  const containerStyle = {
    display: 'flex',
    gap: '6px', // Reduced gap
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
  };

  return (
    <div style={containerStyle}>
      <button
        onClick={() => handleValidation('confirm')}
        disabled={isDisabled}
        style={confirmButtonStyle}
        onMouseEnter={(e) => {
          if (!isDisabled && userValidation !== 'confirm') {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDisabled && userValidation !== 'confirm') {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }
        }}
        title={!isAuthenticated ? 'Login required to validate reports' : isValidating ? 'Validating...' : 'Confirm this report'}
      >
        <Check size={parseInt(sizeStyles.emojiSize)} />
        <span>{isValidating ? '...' : t('common.confirm')}</span>
        {userVerificationLevel === 'trusted' && (
          <Crown size={8} style={{ marginLeft: '2px', color: '#FFD700' }} />
        )}
      </button>

      <button
        onClick={() => handleValidation('deny')}
        disabled={isDisabled}
        style={denyButtonStyle}
        onMouseEnter={(e) => {
          if (!isDisabled && userValidation !== 'deny') {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDisabled && userValidation !== 'deny') {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }
        }}
        title={!isAuthenticated ? 'Login required to validate reports' : isValidating ? 'Validating...' : 'Deny this report'}
      >
        <X size={parseInt(sizeStyles.emojiSize)} />
        <span>{isValidating ? '...' : t('common.deny')}</span>
        {userVerificationLevel === 'trusted' && (
          <Crown size={8} style={{ marginLeft: '2px', color: '#FFD700' }} />
        )}
      </button>
    </div>
  );
};

interface UserVerificationBadgeProps {
  level: 'basic' | 'verified' | 'trusted' | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
}

export const UserVerificationBadge: React.FC<UserVerificationBadgeProps> = ({
  level,
  size = 'xs', // Changed default to 'xs' for mobile
  showLabel = true,
  onClick,
}) => {
  const { t } = useTranslation();
  const verificationInfo = credibilityService.getVerificationLevelInfo(level);

  // Translate verification labels
  const translatedLabel = level === 'trusted' ? t('credibility.trustedReporter') :
    level === 'verified' ? t('credibility.verifiedUser') :
      t('credibility.basicUser');

  // Mobile-responsive sizing
  const isMobile = window.innerWidth < 480;
  const getMobileSize = () => {
    if (isMobile) {
      return {
        padding: '1px 3px',
        fontSize: '0.5rem',
        gap: '2px',
        iconSize: '8px',
      };
    }
    return {
      padding: '2px 6px',
      fontSize: '0.6rem',
      gap: '4px',
      iconSize: '10px',
    };
  };

  const mobileSize = getMobileSize();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default toast behavior
      showToast(verificationInfo.description);
    }
  };

  return (
    <span
      onClick={handleClick}
      style={{
        ...mobileSize,
        borderRadius: '4px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: verificationInfo.color + '20',
        color: verificationInfo.color,
        border: `1px solid ${verificationInfo.color}40`,
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = `0 2px 8px ${verificationInfo.color}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <svg width={mobileSize.iconSize} height={mobileSize.iconSize} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L20 6V12C20 16.418 16.418 20 12 20C7.582 20 4 16.418 4 12V6L12 2Z"
          fill="currentColor"
        />
        <path
          d="M9 11L11 13L15 9"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {translatedLabel}
    </span>
  );
};

// New Community Guard Badge Component
interface CommunityGuardBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  onClick?: () => void;
}

export const CommunityGuardBadge: React.FC<CommunityGuardBadgeProps> = ({
  size = 'md',
  showLabel = true,
  animated = false,
  onClick,
}) => {
  const { t } = useTranslation();

  // Size configurations
  const getSizeConfig = () => {
    switch (size) {
    case 'xs':
      return {
        container: { padding: '2px 4px', fontSize: '0.5rem', gap: '2px' },
        icon: 8,
        borderRadius: '3px',
      };
    case 'sm':
      return {
        container: { padding: '3px 6px', fontSize: '0.6rem', gap: '3px' },
        icon: 10,
        borderRadius: '4px',
      };
    case 'lg':
      return {
        container: { padding: '6px 12px', fontSize: '0.8rem', gap: '6px' },
        icon: 16,
        borderRadius: '6px',
      };
    default: // md
      return {
        container: { padding: '4px 8px', fontSize: '0.7rem', gap: '4px' },
        icon: 12,
        borderRadius: '5px',
      };
    }
  };

  const sizeConfig = getSizeConfig();

  const badgeStyle = {
    ...sizeConfig.container,
    borderRadius: sizeConfig.borderRadius,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
    color: '#1a1a1a',
    border: '1px solid rgba(255, 215, 0, 0.3)',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    boxShadow: animated
      ? '0 2px 8px rgba(255, 215, 0, 0.4), 0 0 16px rgba(255, 215, 0, 0.2)'
      : '0 2px 6px rgba(255, 215, 0, 0.3)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      showToast(t('community.communityGuardDescription', 'Elite Community Guard - Trusted safety leader with proven track record'));
    }
  };

  return (
    <span
      onClick={handleClick}
      style={badgeStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 215, 0, 0.6), 0 0 24px rgba(255, 215, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)';
        e.currentTarget.style.boxShadow = animated
          ? '0 2px 8px rgba(255, 215, 0, 0.4), 0 0 16px rgba(255, 215, 0, 0.2)'
          : '0 2px 6px rgba(255, 215, 0, 0.3)';
      }}
    >
      {/* Shimmer effect overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
        animation: animated ? 'shimmer 2s infinite' : 'none',
        pointerEvents: 'none',
      }} />

      {/* Crown icon */}
      <Crown
        size={sizeConfig.icon}
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth={1}
      />

      {/* Shield icon */}
      <Shield
        size={sizeConfig.icon}
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth={1}
      />

      {showLabel && (
        <span style={{
          fontWeight: '900',
          textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
          position: 'relative',
          zIndex: 1,
        }}>
          {t('community.communityGuard', 'Community Guard')}
        </span>
      )}

      <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </span>
  );
};

interface CredibilityMeterProps {
  score: number;
  className?: string;
}

export const CredibilityMeter: React.FC<CredibilityMeterProps> = ({
  score,
  className = '',
}) => {
  const percentage = Math.round(score * 100);
  const credibilityInfo = credibilityService.getCredibilityLevel(score);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Credibility</span>
          <span className="text-sm font-semibold" style={{ color: credibilityInfo.color }}>
            {percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              backgroundColor: credibilityInfo.color,
            }}
          />
        </div>
      </div>
      <div className="text-lg">{credibilityInfo.icon}</div>
    </div>
  );
};

interface ValidationStatsProps {
  confirmCount: number;
  denyCount: number;
  totalValidations: number;
  className?: string;
}

export const ValidationStats: React.FC<ValidationStatsProps> = ({
  confirmCount,
  denyCount,
  totalValidations,
  className = '',
}) => {
  if (totalValidations === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No validations yet
      </div>
    );
  }

  const confirmPercentage = Math.round((confirmCount / totalValidations) * 100);
  const denyPercentage = Math.round((denyCount / totalValidations) * 100);

  return (
    <div className={`flex items-center gap-4 text-sm ${className}`}>
      <div className="flex items-center gap-1">
        <span className="text-green-600">👍</span>
        <span className="font-medium text-green-700">{confirmCount}</span>
        <span className="text-gray-500">({confirmPercentage}%)</span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-red-600">👎</span>
        <span className="font-medium text-red-700">{denyCount}</span>
        <span className="text-gray-500">({denyPercentage}%)</span>
      </div>

      <div className="text-gray-500">
        {totalValidations} total
      </div>
    </div>
  );
};
