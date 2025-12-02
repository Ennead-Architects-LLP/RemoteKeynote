import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getErrorQueue, clearErrorQueue, flushErrorQueue } from '../utils/errorLogger';
import type { ErrorLog } from '../utils/errorLogger';
import './ErrorDashboard.css';

interface ErrorDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ErrorDashboard = ({ isOpen, onClose }: ErrorDashboardProps) => {
  const theme = useTheme();
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'error' | 'warning'>('all');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadErrors();
      // Refresh every 5 seconds
      const interval = setInterval(loadErrors, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadErrors = () => {
    const queue = getErrorQueue();
    setErrors(queue);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all error logs?')) {
      clearErrorQueue();
      setErrors([]);
      setSelectedError(null);
    }
  };

  const handleFlush = async () => {
    try {
      await flushErrorQueue();
      loadErrors();
      alert('Errors flushed to server successfully');
    } catch (error) {
      alert('Failed to flush errors: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleCopyError = (error: ErrorLog) => {
    const errorText = JSON.stringify(error, null, 2);
    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error details copied to clipboard');
    });
  };

  const filteredErrors = errors.filter((err) => {
    if (filter === 'all') return true;
    return err.severity === filter;
  });

  const errorCounts = {
    all: errors.length,
    critical: errors.filter((e) => e.severity === 'critical').length,
    error: errors.filter((e) => e.severity === 'error').length,
    warning: errors.filter((e) => e.severity === 'warning').length,
  };

  if (!isOpen) return null;

  return (
    <div className="error-dashboard-overlay" onClick={onClose}>
      <div
        className="error-dashboard"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: theme.colors.bg.primary }}
      >
        <div className="error-dashboard-header">
          <h2 style={{ color: theme.colors.text.primary }}>Error Dashboard</h2>
          <button
            className="error-dashboard-close"
            onClick={onClose}
            style={{ color: theme.colors.text.secondary }}
          >
            ✕
          </button>
        </div>

        <div className="error-dashboard-toolbar">
          <div className="error-dashboard-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              style={{
                backgroundColor: filter === 'all' ? theme.colors.purple[600] : theme.colors.bg.tertiary,
                color: theme.colors.text.primary,
              }}
            >
              All ({errorCounts.all})
            </button>
            <button
              className={`filter-btn ${filter === 'critical' ? 'active' : ''}`}
              onClick={() => setFilter('critical')}
              style={{
                backgroundColor: filter === 'critical' ? theme.colors.status.error : theme.colors.bg.tertiary,
                color: theme.colors.text.primary,
              }}
            >
              Critical ({errorCounts.critical})
            </button>
            <button
              className={`filter-btn ${filter === 'error' ? 'active' : ''}`}
              onClick={() => setFilter('error')}
              style={{
                backgroundColor: filter === 'error' ? theme.colors.status.error : theme.colors.bg.tertiary,
                color: theme.colors.text.primary,
              }}
            >
              Errors ({errorCounts.error})
            </button>
            <button
              className={`filter-btn ${filter === 'warning' ? 'active' : ''}`}
              onClick={() => setFilter('warning')}
              style={{
                backgroundColor: filter === 'warning' ? theme.colors.status.warning : theme.colors.bg.tertiary,
                color: theme.colors.text.primary,
              }}
            >
              Warnings ({errorCounts.warning})
            </button>
          </div>
          <div className="error-dashboard-actions">
            <button
              className="error-dashboard-btn"
              onClick={handleFlush}
              style={{
                backgroundColor: theme.colors.purple[600],
                color: theme.colors.text.primary,
              }}
            >
              Flush to Server
            </button>
            <button
              className="error-dashboard-btn"
              onClick={handleClear}
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                color: theme.colors.text.primary,
              }}
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="error-dashboard-content">
          <div className="error-dashboard-list">
            {filteredErrors.length === 0 ? (
              <div className="error-dashboard-empty" style={{ color: theme.colors.text.secondary }}>
                No errors found
              </div>
            ) : (
              filteredErrors
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((error) => (
                  <div
                    key={error.id}
                    className={`error-dashboard-item ${
                      selectedError?.id === error.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedError(error)}
                    style={{
                      backgroundColor:
                        selectedError?.id === error.id
                          ? theme.colors.bg.secondary
                          : theme.colors.bg.tertiary,
                      borderLeftColor:
                        error.severity === 'critical'
                          ? theme.colors.status.error
                          : error.severity === 'error'
                          ? theme.colors.status.error
                          : error.severity === 'warning'
                          ? theme.colors.status.warning
                          : theme.colors.border.default,
                    }}
                  >
                    <div className="error-dashboard-item-header">
                      <span
                        className="error-dashboard-severity"
                        style={{
                          color:
                            error.severity === 'critical' || error.severity === 'error'
                              ? theme.colors.status.error
                              : error.severity === 'warning'
                              ? theme.colors.status.warning
                              : theme.colors.text.secondary,
                        }}
                      >
                        {error.severity?.toUpperCase() || 'ERROR'}
                      </span>
                      <span className="error-dashboard-time" style={{ color: theme.colors.text.tertiary }}>
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="error-dashboard-message" style={{ color: theme.colors.text.primary }}>
                      {error.message}
                    </div>
                    {error.category && (
                      <div className="error-dashboard-category" style={{ color: theme.colors.text.secondary }}>
                        {error.category}
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>

          {selectedError && (
            <div className="error-dashboard-details" style={{ backgroundColor: theme.colors.bg.secondary }}>
              <div className="error-dashboard-details-header">
                <h3 style={{ color: theme.colors.text.primary }}>Error Details</h3>
                <button
                  className="error-dashboard-btn"
                  onClick={() => handleCopyError(selectedError)}
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.primary,
                  }}
                >
                  Copy
                </button>
              </div>
              <div className="error-dashboard-details-content">
                <div className="error-dashboard-detail-section">
                  <label style={{ color: theme.colors.text.secondary }}>Message</label>
                  <pre style={{ color: theme.colors.text.primary }}>{selectedError.message}</pre>
                </div>
                {selectedError.stack && (
                  <div className="error-dashboard-detail-section">
                    <label style={{ color: theme.colors.text.secondary }}>Stack Trace</label>
                    <pre style={{ color: theme.colors.text.primary }}>{selectedError.stack}</pre>
                  </div>
                )}
                {selectedError.componentStack && (
                  <div className="error-dashboard-detail-section">
                    <label style={{ color: theme.colors.text.secondary }}>Component Stack</label>
                    <pre style={{ color: theme.colors.text.primary }}>{selectedError.componentStack}</pre>
                  </div>
                )}
                <div className="error-dashboard-detail-section">
                  <label style={{ color: theme.colors.text.secondary }}>Context</label>
                  <pre style={{ color: theme.colors.text.primary }}>
                    {JSON.stringify(selectedError.additionalContext || {}, null, 2)}
                  </pre>
                </div>
                <div className="error-dashboard-detail-section">
                  <label style={{ color: theme.colors.text.secondary }}>Metadata</label>
                  <div style={{ color: theme.colors.text.primary }}>
                    <div>Severity: {selectedError.severity}</div>
                    <div>Category: {selectedError.category}</div>
                    <div>Timestamp: {new Date(selectedError.timestamp).toLocaleString()}</div>
                    <div>URL: {selectedError.url}</div>
                    {selectedError.userId && <div>User ID: {selectedError.userId}</div>}
                    {selectedError.userName && <div>User Name: {selectedError.userName}</div>}
                    {selectedError.sessionId && <div>Session ID: {selectedError.sessionId}</div>}
                    {selectedError.userAction && <div>User Action: {selectedError.userAction}</div>}
                    {selectedError.performance && (
                      <div>
                        Performance: {selectedError.performance.operation} took{' '}
                        {selectedError.performance.duration?.toFixed(2)}ms
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

