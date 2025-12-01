import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';
import './NotificationSystem.css';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback(
    (message: string, type: NotificationType = 'info', duration: number = 4000) => {
      const id = Math.random().toString(36).substring(7);
      const notification: Notification = { id, message, type, duration };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="notification-container">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const NotificationItem = ({ notification, onRemove }: NotificationItemProps) => {
  const theme = useTheme();

  const getNotificationStyles = () => {
    const baseStyle = {
      backgroundColor: theme.colors.bg.secondary,
      borderColor: theme.colors.border.default,
      color: theme.colors.text.primary,
    };

    switch (notification.type) {
      case 'success':
        return {
          ...baseStyle,
          borderLeftColor: theme.colors.status.success,
        };
      case 'error':
        return {
          ...baseStyle,
          borderLeftColor: theme.colors.status.error,
        };
      case 'warning':
        return {
          ...baseStyle,
          borderLeftColor: theme.colors.status.warning,
        };
      case 'info':
        return {
          ...baseStyle,
          borderLeftColor: theme.colors.status.info,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      className="notification-item"
      style={getNotificationStyles()}
      onClick={() => onRemove(notification.id)}
    >
      <div className="notification-content">
        <span className="notification-message">{notification.message}</span>
      </div>
      <button
        className="notification-close"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(notification.id);
        }}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

