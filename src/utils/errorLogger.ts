/**
 * Error logging utility for production error tracking
 * Works with Vercel and can be extended to use external services
 */

export interface ErrorLog {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  environment: string;
  sessionId?: string;
  userId?: string;
  additionalContext?: Record<string, any>;
}

/**
 * Log error to console and optionally to external service
 */
export function logError(error: Error, context?: Record<string, any>) {
  const errorLog: ErrorLog = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    environment: import.meta.env.MODE || 'development',
    sessionId: getSessionId(),
    ...context,
  };

  // Always log to console
  console.error('Error logged:', errorLog);

  // In production, send to error reporting service
  if (import.meta.env.PROD) {
    sendErrorToService(errorLog).catch((err) => {
      console.error('Failed to send error to service:', err);
    });
  }

  return errorLog;
}

/**
 * Log error with React component stack
 */
export function logReactError(error: Error, errorInfo: { componentStack?: string }, context?: Record<string, any>) {
  return logError(error, {
    ...context,
    componentStack: errorInfo.componentStack,
  });
}

/**
 * Log unhandled promise rejection
 */
export function logUnhandledRejection(reason: any, promise: Promise<any>) {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logError(error, {
    type: 'unhandledRejection',
    promise: promise.toString(),
  });
}

/**
 * Log unhandled error event
 */
export function logUnhandledError(event: ErrorEvent) {
  const error = event.error || new Error(event.message);
  logError(error, {
    type: 'unhandledError',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
}

/**
 * Send error to external service
 * Can be configured to send to Sentry, LogRocket, or custom API
 */
async function sendErrorToService(errorLog: ErrorLog): Promise<void> {
  try {
    // Option 1: Send to your own API endpoint (if you have one)
    // Uncomment and configure if you have an API route:
    /*
    await fetch('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorLog),
    });
    */

    // Option 2: Use Sentry (if configured)
    // Uncomment if you have Sentry set up:
    /*
    if (window.Sentry) {
      window.Sentry.captureException(new Error(errorLog.message), {
        extra: errorLog,
      });
    }
    */

    // Option 3: Use LogRocket (if configured)
    // Uncomment if you have LogRocket set up:
    /*
    if (window.LogRocket) {
      window.LogRocket.captureException(new Error(errorLog.message));
    }
    */

    // For now, errors are logged to console
    // In production on Vercel, you can check Vercel's function logs
    // or set up an external error tracking service
  } catch (err) {
    console.error('Failed to send error to service:', err);
  }
}

/**
 * Get session ID from URL
 */
function getSessionId(): string | undefined {
  const hash = window.location.hash.substring(1);
  if (hash) return hash;

  const params = new URLSearchParams(window.location.search);
  return params.get('session') || undefined;
}

/**
 * Initialize global error handlers
 */
export function initializeErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logUnhandledRejection(event.reason, event.promise);
    // Optionally prevent default browser behavior
    // event.preventDefault();
  });

  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    logUnhandledError(event);
    // Optionally prevent default browser behavior
    // event.preventDefault();
  });

  // Log when error handlers are initialized
  console.log('Error handlers initialized');
}

/**
 * Create a safe async function wrapper that logs errors
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        functionName: fn.name,
        context,
      });
      throw error;
    }
  }) as T;
}

