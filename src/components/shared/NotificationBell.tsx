/* eslint-disable no-unused-vars -- the legacy base rule misreads TypeScript callback signatures */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Inbox, Info } from 'lucide-react';

import { useNotification } from '../../contexts/NotificationContext';

interface NotificationBellProps {
  onNotificationClick?: (notificationId: string) => void;
  permissionStatus?: 'granted' | 'denied' | 'default' | 'unknown';
  tone?: 'light' | 'dark';
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  onNotificationClick,
  permissionStatus,
  tone = 'light',
}) => {
  const { unreadCount, recentNotifications, markAsRead } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition>({ top: 72, left: 12, width: 340, maxHeight: 420 });
  const bellRef = useRef<React.ElementRef<'button'>>(null);
  const dropdownRef = useRef<React.ElementRef<'div'>>(null);

  const sortedNotifications = useMemo(
    () => [...recentNotifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [recentNotifications],
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as globalThis.Node;
      if (!bellRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        bellRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const updatePosition = () => {
      const rect = bellRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const edge = 12;
      const gap = 10;
      const width = Math.min(360, window.innerWidth - (edge * 2));
      const left = Math.min(Math.max(edge, rect.right - width), window.innerWidth - width - edge);
      const below = window.innerHeight - rect.bottom - gap - edge;
      const above = rect.top - gap - edge;
      const openBelow = below >= 260 || below >= above;
      const maxHeight = Math.max(220, Math.min(440, openBelow ? below : above));
      const top = openBelow ? rect.bottom + gap : Math.max(edge, rect.top - maxHeight - gap);

      setPosition({ top, left, width, maxHeight });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    setIsOpen(false);
    onNotificationClick?.(notificationId);
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const diffInSeconds = Math.max(0, Math.floor((Date.now() - timestamp.getTime()) / 1000));
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
    return `${Math.floor(diffInHours / 24)}d`;
  };

  const notificationIcon = (type: string) => {
    switch (type) {
    case 'success': return <CheckCircle2 size={17} />;
    case 'error': return <AlertCircle size={17} />;
    case 'warning': return <AlertTriangle size={17} />;
    default: return <Info size={17} />;
    }
  };

  return (
    <div className={`notification-bell notification-bell--${tone}`}>
      <button
        ref={bellRef}
        type="button"
        className="notification-bell__trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={19} aria-hidden="true" opacity={permissionStatus === 'denied' ? 0.55 : 1} />
        {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="notification-panel"
          role="region"
          aria-label="Notifications"
          style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
        >
          <div className="notification-panel__header">
            <div><strong>Notifications</strong><span>Past 12 hours</span></div>
            {unreadCount > 0 && <span>{unreadCount} new</span>}
          </div>

          <div className="notification-panel__list">
            {sortedNotifications.length === 0 ? (
              <div className="notification-panel__empty">
                <Inbox size={25} />
                <strong>All caught up</strong>
                <span>No recent notifications</span>
              </div>
            ) : sortedNotifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={notification.read ? 'notification-panel__item' : 'notification-panel__item is-unread'}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <span className={`notification-panel__type notification-panel__type--${notification.type}`}>
                  {notificationIcon(notification.type)}
                </span>
                <span className="notification-panel__copy">
                  <strong>{notification.title}</strong>
                  {notification.message && <span>{notification.message}</span>}
                </span>
                <span className="notification-panel__time">{formatTimeAgo(notification.timestamp)}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default NotificationBell;
