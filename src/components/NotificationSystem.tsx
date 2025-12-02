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

// Note: Error notifications do not auto-clear by default
// They must be manually dismissed by clicking on them

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback(
    (message: string, type: NotificationType = 'info', duration?: number) => {
      const id = Math.random().toString(36).substring(7);
      
      // Error notifications should not auto-clear (duration = 0)
      // Other notifications default to 4000ms if duration not specified
      let notificationDuration: number;
      if (duration !== undefined) {
        notificationDuration = duration;
      } else if (type === 'error') {
        notificationDuration = 0; // Don't auto-clear errors
      } else {
        notificationDuration = 4000; // Default 4 seconds for success, info, warning
      }
      
      const notification: Notification = { id, message, type, duration: notificationDuration };

      setNotifications((prev) => [...prev, notification]);

      // Only set timeout if duration > 0
      if (notificationDuration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, notificationDuration);
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
          borderColor: theme.colors.status.success,
        };
      case 'error':
        return {
          ...baseStyle,
          borderColor: theme.colors.status.error,
        };
      case 'warning':
        return {
          ...baseStyle,
          borderColor: theme.colors.status.warning,
        };
      case 'info':
        return {
          ...baseStyle,
          borderColor: theme.colors.status.info,
        };
      default:
        return baseStyle;
    }
  };

  // Error notifications don't auto-clear, so add a visual indicator
  const isPersistent = notification.type === 'error' && (notification.duration === undefined || notification.duration === 0);

  return (
    <div
      className={`notification-item ${isPersistent ? 'notification-persistent' : ''}`}
      style={getNotificationStyles()}
      onClick={() => onRemove(notification.id)}
      title={isPersistent ? 'Click to dismiss (error notifications do not auto-clear)' : 'Click to dismiss'}
    >
      <div className="notification-content">
        <span className="notification-message">{notification.message}</span>
        {isPersistent && (
          <span className="notification-hint" style={{ fontSize: '0.75rem', color: theme.colors.text.tertiary, marginTop: '0.25rem', display: 'block' }}>
            Click to dismiss
          </span>
        )}
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

