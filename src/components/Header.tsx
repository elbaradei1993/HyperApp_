import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Box } from '@chakra-ui/react';

import { useAuth } from '../contexts/AuthContext';
import { useVibe } from '../contexts/VibeContext';
import { VIBE_CONFIG } from '../constants/vibes';
import { fcmService } from '../lib/firebase';

import VibeFigure from './VibeFigure';
import NotificationBell from './shared/NotificationBell';

// Pulsing Line Animation Component - Simple heartbeat effect
const PulsingLineAnimation: React.FC<{ vibeType: string }> = ({ vibeType }) => {
  // Vibe-based animation durations (pulse rates) - slower for better visibility
  const getAnimationDuration = (vibe: string) => {
    switch (vibe) {
    case 'calm': return 3.0; // ~20 BPM (relaxed)
    case 'safe': return 2.5; // ~24 BPM (normal)
    case 'lively': return 1.5; // ~40 BPM (active)
    case 'festive': return 1.2; // ~50 BPM (excited)
    case 'noisy': return 1.0; // ~60 BPM (stress)
    case 'dangerous': return 0.8; // ~75 BPM (alert)
    default: return 2.5;
    }
  };

  // Vibe-based colors using Chakra theme colors
  const getVibeColor = (vibe: string) => {
    switch (vibe) {
    case 'safe': return '#10b981'; // green.500
    case 'calm': return '#3b82f6'; // blue.500
    case 'lively': return '#f59e0b'; // amber.500
    case 'festive': return '#8b5cf6'; // violet.500
    case 'crowded': return '#ef4444'; // red.500
    case 'suspicious': return '#f97316'; // orange.500
    case 'dangerous': return '#dc2626'; // red.600
    case 'noisy': return '#eab308'; // yellow.500
    case 'quiet': return '#06b6d4'; // cyan.500
    default: return '#6b7280'; // gray.500
    }
  };

  const duration = getAnimationDuration(vibeType);
  const color = getVibeColor(vibeType);

  return (
    <Box
      position="relative"
      width="100%"
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {/* Simple pulsing horizontal line */}
      <motion.div
        style={{
          width: '100%',
          height: '2px',
          backgroundColor: color,
          borderRadius: '1px',
        }}
        initial={{ opacity: 0.3 }}
        animate={{
          opacity: [0.3, 1, 0.3],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </Box>
  );
};

// Header component with professional design matching the HTML
interface HeaderProps {
  onNavigateToProfile?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigateToProfile }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentLocationVibe } = useVibe();
  const [showVibeText, setShowVibeText] = React.useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<'granted' | 'denied' | 'default' | 'unknown'>('unknown');

  // Helper function to get user initials for avatar fallback
  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user?.first_name) {
      return user.first_name.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U'; // Default fallback
  };

  const handleProfileClick = () => {
    if (onNavigateToProfile) {
      onNavigateToProfile();
    }
  };

  const handleVibeFigureClick = () => {
    setShowVibeText(!showVibeText);
  };

  // Get vibe display information
  const getVibeDisplayInfo = () => {
    if (!currentLocationVibe) {
      return null;
    }

    const vibeConfig = VIBE_CONFIG[currentLocationVibe.type as keyof typeof VIBE_CONFIG];
    return {
      label: vibeConfig?.label || currentLocationVibe.type,
      icon: vibeConfig?.icon || '❓',
      color: currentLocationVibe.color,
      percentage: Math.round(currentLocationVibe.percentage),
      count: currentLocationVibe.count,
    };
  };

  // Get cool vibe description text
  const getVibeDescription = (vibeType: string) => {
    const descriptions = {
      safe: '🛡️ Your fortress of safety! Community reports show this area is well-protected and secure.',
      calm: '😌 Serenity surrounds you. This peaceful environment promotes relaxation and tranquility.',
      lively: '🎉 Energy is high! The vibrant atmosphere here is perfect for social connections.',
      festive: '🎊 Celebration mode activated! This area is buzzing with joyful, festive vibes.',
      crowded: '👥 People power! The density here creates a lively, communal atmosphere.',
      suspicious: '⚠️ Stay alert! Community reports suggest being cautious in this area.',
      dangerous: '🚨 High alert! Safety reports indicate this area requires extra caution.',
      noisy: '🔊 Sound symphony! The energetic noise level here matches the vibrant activity.',
      quiet: '🤫 Whisper zone! This serene area offers peaceful respite from urban bustle.',
      unknown: '❓ Mystery awaits! Limited reports mean this area is still being discovered.',
    };
    return descriptions[vibeType as keyof typeof descriptions] || '🌟 Every location has its own unique energy!';
  };

  const vibeInfo = getVibeDisplayInfo();

  // Check notification permission status
  useEffect(() => {
    const checkNotificationPermission = async () => {
      try {
        const permissionStatus = await fcmService.getPermissionStatus();
        setNotificationPermissionStatus(permissionStatus);
      } catch (error) {
        console.warn('Error checking notification permission:', error);
        setNotificationPermissionStatus('unknown');
      }
    };

    checkNotificationPermission();
  }, []);

  // Inject styles on component mount
  useEffect(() => {
    const styleId = 'header-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = `
        /* Logout button hover effects */
        .logout-btn:hover {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
          transform: translateY(-1px);
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
        }

        .logout-btn:active {
          transform: translateY(0);
        }

        /* Mobile Styles - Maintain desktop appearance */
        @media (max-width: 767px) {
          .header-content {
            height: 80px !important;
          }
        }

        /* Tablet and Desktop Styles */
        @media (min-width: 768px) {
          .header-content {
            height: 80px !important;
            gap: 24px !important;
          }

        .logo-text {
            font-size: 1.25rem !important;
          }

          .app-icon {
            width: 40px !important;
            height: 40px !important;
          }

          .vibe-status {
            font-size: 0.8125rem !important;
            padding: 3px 10px !important;
          }

          .logout-btn {
            padding: 10px 16px !important;
            font-size: 0.75rem !important;
            gap: 8px !important;
          }

          .logout-text {
            display: inline !important;
          }

          .pulse-container {
            padding-left: 120px !important;
            padding-right: 140px !important;
          }
        }

        /* Touch improvements */
        @media (hover: none) and (pointer: coarse) {
          .logout-btn:hover {
            transform: none !important;
          }
        }

        /* Prevent zoom on input for mobile */
        @media screen and (max-width: 768px) {
          input, select, textarea {
            font-size: 16px;
          }
        }

        /* RTL Support for Header */
        [dir="rtl"] .header-content {
          flex-direction: row-reverse;
        }

        [dir="rtl"] .pulse-container {
          padding-left: 120px !important;
          padding-right: 100px !important;
        }

        [dir="rtl"] .logout-btn {
          right: auto !important;
          left: 0 !important;
        }

        [dir="rtl"] .logo-text {
          text-align: right;
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);

  const MotionDiv = motion.div;

  return (
    <header className="app-header" style={{
      background: '#ffffff',
      borderBottom: '1px solid #f1f5f9',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      position: 'fixed', // Changed from sticky to fixed for better mobile control
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '0 16px',
      // Ensure solid background without backdrop effects
      // Ensure header doesn't cause horizontal scrolling - constrain to viewport
      minWidth: 0,
      width: '100vw',
      maxWidth: '100vw',
      boxSizing: 'border-box',
      // Safe area for notched devices
      paddingTop: 'env(safe-area-inset-top, 0px)',
      // Prevent overflow on all tabs
      overflow: 'hidden',
    }}>
      <div className="header-content" style={{
        maxWidth: '100vw',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '80px',
        position: 'relative',
        // Mobile responsive height
        minHeight: '80px',
        // Ensure content doesn't overflow on small screens
        overflow: 'hidden',
        // Prevent any width expansion
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* App Name and Vibe Status - Left Side */}
        <MotionDiv
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            zIndex: 2,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '2px',
          }}
        >
          <div className="logo-text" style={{
            fontSize: '1.125rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.025em',
            whiteSpace: 'nowrap',
          }}>{t('app.appName')}</div>
        </MotionDiv>

        {/* Notification Bell and Profile Picture - Far Right Side */}
        <MotionDiv
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          style={{
            position: 'absolute',
            right: '0',
            top: '20px', // Center with the 40px favicon container
            zIndex: 3, // Higher z-index so ECG line shows behind it
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Notification Bell */}
          <NotificationBell
            permissionStatus={notificationPermissionStatus}
            onNotificationClick={(notificationId) => {
              // Handle notification click - could navigate to specific location or show details
              console.log('Notification clicked:', notificationId);
            }}
          />

          {/* Profile Picture */}
          <button
            onClick={handleProfileClick}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '2px solid transparent', // Make border transparent so ECG shows through
              background: 'rgba(255, 255, 255, 0.9)', // More opaque background
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              WebkitTapHighlightColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '0',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
            }}
            aria-label="Go to profile"
          >
            {user?.profile_picture_url ? (
              <img
                src={user.profile_picture_url}
                alt="Profile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                }}
              />
            ) : (
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#475569',
                textTransform: 'uppercase',
              }}>
                {getUserInitials()}
              </span>
            )}
          </button>
        </MotionDiv>
      </div>
    </header>
  );
};

export default Header;
