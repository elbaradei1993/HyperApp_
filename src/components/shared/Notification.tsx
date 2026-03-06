import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
  style?: React.CSSProperties;
}

const Notification: React.FC<NotificationProps> = ({
  type,
  title,
  message,
  duration = 5000,
  onClose,
  style: customStyle,
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300); // Match transition duration
  };

  if (!isVisible) {
    return null;
  }

  const typeClasses = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-400',
      iconBg: 'bg-green-100',
      title: 'text-green-800',
      message: 'text-green-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-400',
      iconBg: 'bg-red-100',
      title: 'text-red-800',
      message: 'text-red-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-400',
      iconBg: 'bg-yellow-100',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-400',
      iconBg: 'bg-blue-100',
      title: 'text-blue-800',
      message: 'text-blue-700',
    },
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  };

  const defaultStyle: React.CSSProperties = {
    position: 'fixed',
    top: 'calc(80px + env(safe-area-inset-top, 0px) + 20px)',
    right: '20px',
    zIndex: 10000,
    maxWidth: '400px',
    width: '100%',
    backgroundColor: type === 'success' ? '#d1fae5' : type === 'error' ? '#fee2e2' : type === 'warning' ? '#fef3c7' : '#dbeafe',
    border: `1px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
    opacity: isExiting ? 0 : 1,
    transition: 'all 300ms ease-in-out',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    pointerEvents: 'auto',
  };

  return (
    <div
      style={{ ...defaultStyle, ...customStyle }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{
          flexShrink: 0,
          backgroundColor: type === 'success' ? '#a7f3d0' : type === 'error' ? '#fecaca' : type === 'warning' ? '#fde68a' : '#bfdbfe',
          borderRadius: '8px',
          padding: '4px',
        }}>
          <div style={{
            color: type === 'success' ? '#065f46' : type === 'error' ? '#991b1b' : type === 'warning' ? '#92400e' : '#1e40af',
          }}>
            {icons[type]}
          </div>
        </div>

        <div style={{ marginLeft: '12px', flex: 1 }}>
          <p style={{
            fontSize: '12px',
            fontWeight: '500',
            margin: '0 0 4px 0',
            color: type === 'success' ? '#065f46' : type === 'error' ? '#991b1b' : type === 'warning' ? '#92400e' : '#1e40af',
          }}>
            {title}
          </p>
          {message && (
            <p style={{
              fontSize: '12px',
              margin: '4px 0 0 0',
              color: type === 'success' ? '#047857' : type === 'error' ? '#dc2626' : type === 'warning' ? '#d97706' : '#1d4ed8',
            }}>
              {message}
            </p>
          )}
        </div>

        <div style={{ marginLeft: '16px', flexShrink: 0 }}>
          <button
            onClick={handleClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: type === 'success' ? '#065f46' : type === 'error' ? '#991b1b' : type === 'warning' ? '#92400e' : '#1e40af',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
            }}
          >
            <span className="sr-only">{t('common.close')}</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Notification Manager Component
interface NotificationManagerProps {
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
  }>;
  onRemove: (id: string) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  onRemove,
}) => {
  // Limit to maximum 3 notifications to prevent screen coverage
  const visibleNotifications = notifications.slice(0, 3);

  return (
    <>
      {visibleNotifications.map((notification, index) => (
        <Notification
          key={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          duration={notification.duration}
          onClose={() => onRemove(notification.id)}
          style={{
            top: `calc(80px + env(safe-area-inset-top, 0px) + 20px + ${index * 80}px)`,
          }}
        />
      ))}
    </>
  );
};

export default Notification;
