import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, MapPin } from 'lucide-react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManualLocation: () => void;
}

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onManualLocation,
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      primaryActionRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleTryAgain = async () => {
    setIsLoading(true);
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      onManualLocation();
    } catch {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          background: '#111318',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: '22px',
          width: '100%', maxWidth: '480px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 22px 18px',
          borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(255,59,92,0.12)',
              border: '0.5px solid rgba(255,59,92,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <AlertTriangle size={18} color="#ff3b5c" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#f4f4f5', lineHeight: 1.2 }}>
                {t('location.permission.title', 'Location Access Required')}
              </div>
              <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                {t('location.permission.subtitle', 'Enable location to see nearby safety reports')}
              </div>
            </div>
          </div>
          <button
            aria-label="Close modal"
            onClick={onClose}
            style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: '#71717a', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          {/* Why we need location */}
          <div style={{
            background: 'rgba(0,200,150,0.06)',
            border: '0.5px solid rgba(0,200,150,0.18)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#00c896', marginBottom: '10px' }}>
              {t('location.permission.whyWeed', 'Why we need your location')}
            </div>
            {[
              t('location.permission.reason1', 'Show safety reports near you'),
              t('location.permission.reason2', 'Help others find your reports'),
              t('location.permission.reason3', 'Provide location-based alerts'),
              t('location.permission.reason4', 'Improve community safety mapping'),
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00c896', marginTop: '5px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.4 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* How to enable */}
          <div style={{
            background: 'rgba(245,158,11,0.06)',
            border: '0.5px solid rgba(245,158,11,0.18)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b', marginBottom: '10px' }}>
              {t('location.permission.howToEnable', 'How to enable location')}
            </div>
            {[
              { label: 'iOS', text: t('location.permission.ios', 'Settings → Privacy → Location Services → Safari → Allow') },
              { label: 'Android', text: t('location.permission.android', 'Settings → Apps → [Browser] → Permissions → Location → Allow') },
              { label: 'Desktop', text: t('location.permission.desktop', "Click the location icon in your browser's address bar") },
            ].map(({ label, text }) => (
              <div key={label} style={{ marginBottom: '8px', fontSize: '12px', color: '#a1a1aa', lineHeight: 1.4 }}>
                <span style={{ color: '#f4f4f5', fontWeight: '600' }}>{label}: </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 22px 20px',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', gap: '8px',
          flexShrink: 0, background: '#0f1115',
        }}>
          <button
            ref={primaryActionRef}
            onClick={onManualLocation}
            style={{
              width: '100%', padding: '13px',
              background: '#00c896', color: '#09090b',
              border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: '700',
              cursor: 'pointer', letterSpacing: '0.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <MapPin size={16} />
            {t('location.permission.setManually', 'Set Location Manually')}
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '12px',
              background: 'rgba(255,255,255,0.04)',
              color: '#a1a1aa',
              border: '0.5px solid rgba(255,255,255,0.09)',
              borderRadius: '12px',
              fontSize: '14px', fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            {t('location.permission.continueWithout', 'Continue Without Location')}
          </button>

          <button
            onClick={handleTryAgain}
            disabled={isLoading}
            style={{
              width: '100%', padding: '12px',
              background: 'transparent', color: '#00c896',
              border: 'none', borderRadius: '12px',
              fontSize: '13px', fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? t('location.permission.trying', 'Trying…') : t('location.permission.tryAgain', 'Try Again')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
