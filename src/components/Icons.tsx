import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const IconLayers: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="12,2 2,7 12,12 22,7 12,2"></polygon>
    <polyline points="2,17 12,22 22,17"></polyline>
    <polyline points="2,12 12,17 22,12"></polyline>
  </svg>
);

export const IconHeartPulse: React.FC<IconProps> = ({ size = 14, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>
    <path d="M3.5 12.5 9 17l4-4 2 2 3-3"/>
  </svg>
);

// Premium professional icons for legal documents
export const IconShield: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2L4 5v7c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-8-3z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

export const IconFileText: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14.5,2 14.5,8 20.5,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);

export const IconEye: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2.99902 12.1166C3.48427 11.4043 8.7836 3.41602 12 3.41602C15.2164 3.41602 20.5157 11.4043 21.001 12.1166C21.1582 12.3759 21.1582 12.6241 21.001 12.8834C20.5157 13.5957 15.2164 21.584 12 21.584C8.7836 21.584 3.48427 13.5957 2.99902 12.8834C2.8418 12.6241 2.8418 12.3759 2.99902 12.1166Z"/>
    <circle cx="12" cy="12.5" r="3.5"/>
    <circle cx="12" cy="12.5" r="1.5"/>
  </svg>
);

export const IconLock: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <circle cx="12" cy="16" r="1.5"/>
    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>
);

export const IconUsers: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export const IconGlobe: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    <line x1="12" y1="2" x2="12" y2="22"/>
  </svg>
);

export const IconCookie: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 0-5-5"/>
    <circle cx="8.5" cy="8.5" r="1"/>
    <circle cx="16" cy="15.5" r="1"/>
    <circle cx="12" cy="12" r="1"/>
    <circle cx="11" cy="17" r="1"/>
    <circle cx="7" cy="14" r="1"/>
  </svg>
);

export const IconAlertTriangle: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export const IconScale: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/>
    <path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/>
    <path d="M7 21h10"/>
    <path d="M12 3v18"/>
    <path d="M3 7h2"/>
    <path d="M17 7h2"/>
    <path d="M19 11h2"/>
    <path d="M3 11h2"/>
  </svg>
);

export const IconGavel: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.5 12.5l-3.5 3.5c-.83.83-2.17.83-3 0L3.5 12.5"/>
    <path d="M6.5 9.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5.5"/>
    <path d="M14.5 12.5l3.5-3.5c.83-.83.83-2.17 0-3L14.5 3.5"/>
    <path d="M18.5 6.5v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V7.5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1z"/>
  </svg>
);

export const IconPhone: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

export const IconClock: React.FC<IconProps> = ({ size = 20, color = '#666', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);
