import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  recentNotifications: NotificationItem[]; // Last 12 hours
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => string;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Get notifications from last 12 hours
  const recentNotifications = notifications.filter(n => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return n.timestamp >= twelveHoursAgo;
  });

  const addNotification = (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): string => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const duration = notification.duration ?? 5000;
    const newNotification: NotificationItem = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false,
      duration,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration (if not 0)
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification,
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    recentNotifications,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
