import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useVibe } from '../contexts/VibeContext';
import { useBreakpoint } from '../lib/useBreakpoint';
import { VIBE_CONFIG } from '../constants/vibes';
import NotificationBell from './shared/NotificationBell';

interface HeaderProps {
  onNavigateToProfile?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigateToProfile }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentLocationVibe } = useVibe();
  const { isDesktop, isMobile } = useBreakpoint();

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
    return 'U';
  };

  return (
    <header
      style={isMobile ? {
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '56px', zIndex: 100,
        background: 'rgba(9,9,11,0.93)',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '12px',
      } : {
        height: '64px',
        background: 'rgba(9,9,11,0.92)',
        borderBottom: '0.5px solid var(--wire)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center',
        padding: '0 28px', gap: '16px',
        position: 'sticky', top: 0, zIndex: 70,
      }}
    >
      {/* Mobile: Logo mark + wordmark */}
      {isMobile && (
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
          <div style={{
            width:'28px', height:'28px', borderRadius:'8px',
            background:'linear-gradient(135deg,#00c896,#4f8ef7)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <div style={{ width:'11px', height:'11px', background:'rgba(9,9,11,0.5)', clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' }} />
          </div>
          <span style={{ fontSize:'15px', fontWeight:'800', color:'var(--t1)', letterSpacing:'-0.3px' }}>HyperApp</span>
        </div>
      )}

      {/* Center: Vibe pill */}
      <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
        {currentLocationVibe ? (
          <div style={{
            display:'flex', alignItems:'center', gap:'7px',
            background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.09)',
            borderRadius:'20px', padding:'5px 12px 5px 8px',
          }}>
            <div style={{
              width:'8px', height:'8px', borderRadius:'50%', flexShrink:0,
              background: (VIBE_CONFIG[currentLocationVibe.type as keyof typeof VIBE_CONFIG]?.color) || 'var(--accent)',
            }} />
            <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--t1)' }}>
              {VIBE_CONFIG[currentLocationVibe.type as keyof typeof VIBE_CONFIG]?.label || currentLocationVibe.type}
            </span>
            <span style={{ fontSize:'12px', fontWeight:'700', color: VIBE_CONFIG[currentLocationVibe.type as keyof typeof VIBE_CONFIG]?.color || 'var(--accent)' }}>
              {Math.round(currentLocationVibe.percentage)}%
            </span>
          </div>
        ) : (
          <span style={{ fontSize:'12px', color:'var(--t3)' }}>Scanning area…</span>
        )}
      </div>

      {/* Right: Bell + Avatar */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
        <NotificationBell />
        <div
          onClick={onNavigateToProfile}
          style={{
            width:'32px', height:'32px', borderRadius:'9px', flexShrink:0,
            background:'linear-gradient(135deg,#00c896,#4f8ef7)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', fontSize:'12px', fontWeight:'700', color:'white',
          }}
        >
          {getUserInitials()}
        </div>
      </div>
    </header>
  );
};

export default Header;
