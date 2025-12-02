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
  logLevel?: 'error' | 'warn' | 'info' | 'log' | 'debug';
  logData?: any[];
}

/**
 * Log error to console and optionally to external service
 */
export function logError(error: Error, context?: Record<string, any>) {
  // Ensure we have a stack trace - create one if missing
  let stack = error.stack;
  if (!stack) {
    try {
      throw new Error(error.message);
    } catch (e) {
      stack = (e as Error).stack;
    }
  }

  const errorLog: ErrorLog = {
    message: error.message,
    stack: stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    environment: import.meta.env.MODE || 'development',
    sessionId: getSessionId(),
    logLevel: 'error',
    ...context,
  };

  // Always log to console (use original to avoid recursion)
  if (originalConsole) {
    originalConsole.error('Error logged:', errorLog);
  } else {
    console.error('Error logged:', errorLog);
  }

  // Always try to send to error reporting service (works in both dev and prod)
  sendErrorToService(errorLog).catch((err) => {
    if (originalConsole) {
      originalConsole.error('Failed to send error to service:', err);
    } else {
      console.error('Failed to send error to service:', err);
    }
  });

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
    // Send to Vercel API endpoint
    await fetch('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorLog),
    }).catch((fetchError) => {
      // Silently fail if API is not available (e.g., in development)
      if (originalConsole) {
        originalConsole.warn('Failed to send error to API:', fetchError);
      } else {
        console.warn('Failed to send error to API:', fetchError);
      }
    });

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
 * Log general console output (log, warn, info, debug)
 */
export function logConsoleOutput(level: 'log' | 'warn' | 'info' | 'debug', ...args: any[]) {
  const errorLog: ErrorLog = {
    message: `Console ${level}: ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')}`,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    environment: import.meta.env.MODE || 'development',
    sessionId: getSessionId(),
    logLevel: level,
    logData: args.map(arg => {
      // Serialize objects safely
      try {
        return typeof arg === 'object' ? JSON.parse(JSON.stringify(arg)) : arg;
      } catch {
        return String(arg);
      }
    }),
  };

  // Always try to send to service
  sendErrorToService(errorLog).catch(() => {
    // Silently fail
  });
}

// Store original console methods to avoid recursion
let originalConsole: {
  log: typeof console.log;
  warn: typeof console.warn;
  error: typeof console.error;
  info: typeof console.info;
  debug: typeof console.debug;
} | null = null;

/**
 * Intercept console methods to capture all logs
 */
function interceptConsole() {
  // Store original methods
  originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  console.log = (...args: any[]) => {
    originalConsole!.log.apply(console, args);
    logConsoleOutput('log', ...args);
  };

  console.warn = (...args: any[]) => {
    originalConsole!.warn.apply(console, args);
    logConsoleOutput('warn', ...args);
  };

  console.error = (...args: any[]) => {
    originalConsole!.error.apply(console, args);
    // Check if first arg is an Error - if so, use logError, otherwise use logConsoleOutput
    const firstArg = args[0];
    if (firstArg instanceof Error) {
      logError(firstArg, {
        type: 'consoleError',
        consoleArgs: args.slice(1),
      });
    } else {
      logConsoleOutput('error', ...args);
    }
  };

  console.info = (...args: any[]) => {
    originalConsole!.info.apply(console, args);
    logConsoleOutput('info', ...args);
  };

  console.debug = (...args: any[]) => {
    originalConsole!.debug.apply(console, args);
    logConsoleOutput('debug', ...args);
  };
}

/**
 * Capture network errors
 */
function interceptNetworkErrors() {
  // Intercept fetch errors
  const originalFetch = window.fetch;
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    try {
      const response = await originalFetch(...args);
      
      // Log failed requests
      if (!response.ok) {
        const error = new Error(`Network request failed: ${response.status} ${response.statusText}`);
        logError(error, {
          type: 'networkError',
          url: typeof args[0] === 'string' ? args[0] : args[0].url,
          status: response.status,
          statusText: response.statusText,
          method: typeof args[1] !== 'undefined' && args[1].method ? args[1].method : 'GET',
        });
      }
      
      return response;
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        type: 'networkError',
        url: typeof args[0] === 'string' ? args[0] : args[0].url,
        method: typeof args[1] !== 'undefined' && args[1].method ? args[1].method : 'GET',
      });
      throw error;
    }
  };

  // Listen for network errors
  window.addEventListener('error', (event) => {
    if (event.target && (event.target as any).tagName) {
      const target = event.target as HTMLElement;
      if (target.tagName === 'SCRIPT' || target.tagName === 'LINK' || target.tagName === 'IMG') {
        const error = new Error(`Failed to load resource: ${(target as any).src || (target as any).href}`);
        logError(error, {
          type: 'resourceLoadError',
          tagName: target.tagName,
          src: (target as any).src || (target as any).href,
        });
      }
    }
  }, true);
}

/**
 * Initialize global error handlers
 */
export function initializeErrorHandlers() {
  // Intercept console methods
  interceptConsole();

  // Intercept network errors
  interceptNetworkErrors();

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

