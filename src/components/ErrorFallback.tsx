import { useTheme } from '../context/ThemeContext';
import { useNotifications } from './NotificationSystem';

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

interface ErrorInfo {
  componentStack?: string;
}

export const ErrorFallback = ({ error, errorInfo, onReset }: ErrorFallbackProps) => {
  const theme = useTheme();
  const { showNotification } = useNotifications();

  const handleCopyError = () => {
    const errorText = `
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      showNotification('Error details copied to clipboard', 'success');
    });
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="error-boundary" style={{ backgroundColor: theme.colors.bg.primary }}>
      <div className="error-boundary-content">
        <div className="error-boundary-icon" style={{ color: theme.colors.status.error }}>
          ⚠️
        </div>
        <h1 className="error-boundary-title" style={{ color: theme.colors.text.primary }}>
          Something went wrong
        </h1>
        <p className="error-boundary-message" style={{ color: theme.colors.text.secondary }}>
          An unexpected error occurred. Please try refreshing the page.
        </p>

        {import.meta.env.DEV && error && (
          <details className="error-boundary-details">
            <summary style={{ color: theme.colors.text.secondary, cursor: 'pointer' }}>
              Error Details (Development Only)
            </summary>
            <div className="error-boundary-error-info">
              <pre
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.text.primary,
                  padding: '1rem',
                  borderRadius: '8px',
                  overflow: 'auto',
                  fontSize: '0.875rem',
                }}
              >
                {error.toString()}
                {error.stack && `\n\n${error.stack}`}
                {errorInfo?.componentStack && `\n\nComponent Stack:\n${errorInfo.componentStack}`}
              </pre>
            </div>
          </details>
        )}

        <div className="error-boundary-actions">
          <button
            className="error-boundary-button error-boundary-button-primary"
            onClick={handleReload}
            style={{
              backgroundColor: theme.colors.purple[600],
              color: theme.colors.text.primary,
            }}
          >
            Reload Page
          </button>
          <button
            className="error-boundary-button"
            onClick={handleCopyError}
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.default,
            }}
          >
            Copy Error Details
          </button>
          <button
            className="error-boundary-button"
            onClick={onReset}
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.default,
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

