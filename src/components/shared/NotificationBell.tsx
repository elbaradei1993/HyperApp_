import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useNotification } from '../../contexts/NotificationContext';

interface NotificationBellProps {
  onNotificationClick?: (notificationId: string) => void;
  permissionStatus?: 'granted' | 'denied' | 'default' | 'unknown';
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onNotificationClick, permissionStatus }) => {
  const { unreadCount, recentNotifications, markAsRead } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bellRef.current &&
        dropdownRef.current &&
        !bellRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    setIsOpen(false);
    onNotificationClick?.(notificationId);
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return '🔔';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon */}
      <div
        ref={bellRef}
        onClick={handleBellClick}
        style={{
          position: 'relative',
          width: '44px',
          height: '44px',
          borderRadius: '8px',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          padding: '8px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {/* Clean SVG Bell Icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: permissionStatus === 'denied' ? 'var(--text-muted)' : 'var(--text-primary)',
            position: 'relative',
            opacity: permissionStatus === 'denied' ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '10px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '600',
            border: '2px solid var(--bg-primary)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </div>

      {/* Dropdown - Rendered via Portal to ensure it's above everything */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: '92px', // Header height (80px) + some padding
            right: '16px',
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            zIndex: 2147483647,
            maxHeight: '400px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            borderRadius: '12px 12px 0 0',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: '0',
            }}>
              Notifications
            </h3>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              margin: '4px 0 0 0',
            }}>
              Past 12 hours
            </p>
          </div>

          {/* Notifications List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '300px',
          }}>
            {recentNotifications.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}>
                <span style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>🔔</span>
                <p style={{ fontSize: '14px', margin: '0' }}>No recent notifications</p>
              </div>
            ) : (
              recentNotifications
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: notification.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                      transition: 'background-color 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minHeight: '48px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = notification.read
                        ? 'rgba(0, 0, 0, 0.02)'
                        : 'rgba(59, 130, 246, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notification.read
                        ? 'transparent'
                        : 'rgba(59, 130, 246, 0.05)';
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      fontSize: '16px',
                      flexShrink: 0,
                    }}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content - Single Line Only */}
                    <div style={{
                      flex: 1,
                      minWidth: 0, // Allow text to truncate
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        fontSize: '13px', // Slightly smaller for mobile
                        fontWeight: notification.read ? '400' : '500',
                        color: 'var(--text-primary)',
                        lineHeight: '1.2', // Tighter line height
                        whiteSpace: 'nowrap', // NO WRAPPING
                        overflow: 'hidden',
                        textOverflow: 'ellipsis', // Show ... when truncated
                        marginBottom: notification.message ? '1px' : '0',
                      }}>
                        {notification.title}
                      </div>
                      {notification.message && (
                        <div style={{
                          fontSize: '11px', // Smaller secondary text
                          color: 'var(--text-muted)',
                          lineHeight: '1.1', // Very tight
                          whiteSpace: 'nowrap', // NO WRAPPING
                          overflow: 'hidden',
                          textOverflow: 'ellipsis', // Show ... when truncated
                        }}>
                          {notification.message}
                        </div>
                      )}
                    </div>

                    {/* Time & Unread Dot */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '2px',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}>
                        {formatTimeAgo(notification.timestamp)}
                      </span>
                      {!notification.read && (
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#ef4444',
                        }} />
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>,
        document.body, // Portal target - renders at document root level
      )}
    </div>
  );
};

export default NotificationBell;
