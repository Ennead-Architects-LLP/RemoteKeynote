/**
 * Enhanced error logging utility for comprehensive error tracking
 * Works with Vercel and can be extended to use external services
 */

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info' | 'debug';
export type ErrorCategory = 
  | 'network' 
  | 'firebase' 
  | 'react' 
  | 'userAction' 
  | 'performance' 
  | 'validation' 
  | 'unknown';

export interface ErrorLog {
  id?: string; // Unique error ID for deduplication
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  environment: string;
  sessionId?: string;
  userId?: string;
  userName?: string;
  additionalContext?: Record<string, any>;
  logLevel?: 'error' | 'warn' | 'info' | 'log' | 'debug';
  logData?: any[];
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  fingerprint?: string; // For error grouping
  userAction?: string; // What the user was doing
  performance?: {
    duration?: number;
    operation?: string;
  };
  retryCount?: number;
  isRetryable?: boolean;
}

// Global state for error tracking
let currentUserId: string | undefined;
let currentUserName: string | undefined;
let currentUserAction: string | undefined;
const errorQueue: ErrorLog[] = [];
const MAX_QUEUE_SIZE = 100;
const ERROR_DEDUP_WINDOW = 60000; // 1 minute
const recentErrors = new Map<string, number>(); // fingerprint -> timestamp

/**
 * Set current user context for error logging
 */
export function setUserContext(userId?: string, userName?: string) {
  currentUserId = userId;
  currentUserName = userName;
}

/**
 * Set current user action for error logging
 */
export function setUserAction(action: string) {
  currentUserAction = action;
}

/**
 * Generate error fingerprint for deduplication
 */
function generateFingerprint(error: Error, context?: Record<string, any>): string {
  const keyParts = [
    error.message,
    context?.component || '',
    context?.operation || '',
    context?.type || '',
  ];
  return keyParts.join('|');
}

/**
 * Check if error should be logged (deduplication)
 */
function shouldLogError(fingerprint: string): boolean {
  const now = Date.now();
  const lastSeen = recentErrors.get(fingerprint);
  
  if (!lastSeen || (now - lastSeen) > ERROR_DEDUP_WINDOW) {
    recentErrors.set(fingerprint, now);
    // Clean old entries
    if (recentErrors.size > 1000) {
      const cutoff = now - ERROR_DEDUP_WINDOW;
      for (const [fp, ts] of recentErrors.entries()) {
        if (ts < cutoff) {
          recentErrors.delete(fp);
        }
      }
    }
    return true;
  }
  return false;
}

/**
 * Determine error severity
 */
function determineSeverity(error: Error, context?: Record<string, any>): ErrorSeverity {
  const message = error.message.toLowerCase();
  
  // Critical errors
  if (
    message.includes('network') && message.includes('failed') ||
    message.includes('firebase') && (message.includes('permission') || message.includes('auth')) ||
    context?.type === 'networkError' && context?.status && context.status >= 500
  ) {
    return 'critical';
  }
  
  // Errors
  if (
    message.includes('error') ||
    message.includes('failed') ||
    message.includes('exception')
  ) {
    return 'error';
  }
  
  // Warnings
  if (
    message.includes('warning') ||
    message.includes('deprecated') ||
    context?.type === 'networkError' && context?.status && context.status >= 400 && context.status < 500
  ) {
    return 'warning';
  }
  
  return 'error';
}

/**
 * Determine error category
 */
function determineCategory(error: Error, context?: Record<string, any>): ErrorCategory {
  if (context?.type === 'networkError' || context?.type === 'resourceLoadError') {
    return 'network';
  }
  if (context?.component === 'useSpreadsheet' || context?.operation?.includes('firebase')) {
    return 'firebase';
  }
  if (context?.componentStack || context?.component === 'ErrorBoundary') {
    return 'react';
  }
  if (context?.userAction || currentUserAction) {
    return 'userAction';
  }
  if (context?.performance) {
    return 'performance';
  }
  if (context?.type === 'validation') {
    return 'validation';
  }
  return 'unknown';
}

/**
 * Log error to console and optionally to external service
 */
export function logError(
  error: Error, 
  context?: Record<string, any>,
  options?: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    skipDeduplication?: boolean;
  }
) {
  // Ensure we have a stack trace - create one if missing
  let stack = error.stack;
  if (!stack) {
    try {
      throw new Error(error.message);
    } catch (e) {
      stack = (e as Error).stack;
    }
  }

  const fingerprint = generateFingerprint(error, context);
  
  // Deduplication check
  if (!options?.skipDeduplication && !shouldLogError(fingerprint)) {
    return null; // Skip duplicate error
  }

  const errorLog: ErrorLog = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    message: error.message,
    stack: stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    environment: import.meta.env.MODE || 'development',
    sessionId: getSessionId(),
    userId: currentUserId || context?.userId,
    userName: currentUserName || context?.userName,
    logLevel: 'error',
    severity: options?.severity || determineSeverity(error, context),
    category: options?.category || determineCategory(error, context),
    fingerprint,
    userAction: currentUserAction || context?.userAction,
    ...context,
  };

  // Always log to console (use original to avoid recursion)
  if (originalConsole) {
    originalConsole.error(`[${errorLog.severity?.toUpperCase()}] Error logged:`, errorLog);
  } else {
    console.error(`[${errorLog.severity?.toUpperCase()}] Error logged:`, errorLog);
  }

  // Add to queue for offline handling
  addToErrorQueue(errorLog);

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
 * Add error to offline queue
 */
function addToErrorQueue(errorLog: ErrorLog): void {
  errorQueue.push(errorLog);
  
  // Limit queue size
  if (errorQueue.length > MAX_QUEUE_SIZE) {
    errorQueue.shift(); // Remove oldest
  }
  
  // Try to persist to localStorage
  try {
    const stored = localStorage.getItem('errorQueue');
    const queue = stored ? JSON.parse(stored) : [];
    queue.push(errorLog);
    // Keep only last 50 in localStorage
    const trimmed = queue.slice(-50);
    localStorage.setItem('errorQueue', JSON.stringify(trimmed));
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Get errors from queue
 */
export function getErrorQueue(): ErrorLog[] {
  try {
    const stored = localStorage.getItem('errorQueue');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear error queue
 */
export function clearErrorQueue(): void {
  errorQueue.length = 0;
  try {
    localStorage.removeItem('errorQueue');
  } catch {
    // Ignore
  }
}

/**
 * Flush error queue to server
 */
export async function flushErrorQueue(): Promise<void> {
  const queue = getErrorQueue();
  if (queue.length === 0) return;
  
  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batch: true, errors: queue }),
    });
    
    clearErrorQueue();
  } catch (err) {
    if (originalConsole) {
      originalConsole.warn('Failed to flush error queue:', err);
    }
  }
}

/**
 * Send error to external service
 * Can be configured to send to Sentry, LogRocket, or custom API
 */
async function sendErrorToService(errorLog: ErrorLog): Promise<void> {
  try {
    // Send to Vercel API endpoint
    const response = await fetch('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorLog),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (fetchError) {
    // If network fails, error is already in queue
    // Try to flush queue when connection is restored
    if (navigator.onLine) {
      // Connection might be restored, try flushing
      setTimeout(() => flushErrorQueue(), 5000);
    }
    
    if (originalConsole) {
      originalConsole.warn('Failed to send error to API:', fetchError);
    } else {
      console.warn('Failed to send error to API:', fetchError);
    }
  }

  // Option 2: Use Sentry (if configured)
  // Uncomment if you have Sentry set up:
  /*
  if (window.Sentry) {
    window.Sentry.captureException(new Error(errorLog.message), {
      extra: errorLog,
      level: errorLog.severity === 'critical' ? 'fatal' : errorLog.severity,
      tags: {
        category: errorLog.category,
      },
    });
  }
  */

  // Option 3: Use LogRocket (if configured)
  // Uncomment if you have LogRocket set up:
  /*
  if (window.LogRocket) {
    window.LogRocket.captureException(new Error(errorLog.message), {
      tags: {
        severity: errorLog.severity,
        category: errorLog.category,
      },
    });
  }
  */
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
 * Messages to filter out from production logs
 */
const FILTERED_MESSAGES = [
  'Error handlers initialized',
];

/**
 * Log general console output (log, warn, info, debug)
 */
export function logConsoleOutput(level: 'log' | 'warn' | 'info' | 'debug', ...args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

  // Filter out initialization and debug messages in production
  const isProduction = import.meta.env.MODE === 'production';
  const isFilteredMessage = FILTERED_MESSAGES.some(filtered => message.includes(filtered));
  
  // In production, only send errors and warnings, and skip filtered messages
  if (isProduction && (level === 'log' || level === 'info' || level === 'debug' || isFilteredMessage)) {
    return; // Don't send to API in production
  }

  const errorLog: ErrorLog = {
    message: `Console ${level}: ${message}`,
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

  // Try to send to service
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
    // Check if first arg is an Error - if so, use logError, otherwise use logConsoleOutput with 'warn'
    const firstArg = args[0];
    if (firstArg instanceof Error) {
      logError(firstArg, {
        type: 'consoleError',
        consoleArgs: args.slice(1),
      });
    } else {
      logConsoleOutput('warn', ...args);
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
        const urlString = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request).url;
        logError(error, {
          type: 'networkError',
          url: urlString,
          status: response.status,
          statusText: response.statusText,
          method: typeof args[1] !== 'undefined' && args[1].method ? args[1].method : 'GET',
        });
      }
      
      return response;
    } catch (error) {
      const urlString = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request).url;
      logError(error instanceof Error ? error : new Error(String(error)), {
        type: 'networkError',
        url: urlString,
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
 * Log performance metrics
 */
export function logPerformance(operation: string, duration: number, context?: Record<string, any>) {
  const isSlow = duration > 1000; // Log operations > 1 second
  
  if (isSlow || import.meta.env.DEV) {
    const errorLog: ErrorLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      message: `Slow operation: ${operation} took ${duration}ms`,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      environment: import.meta.env.MODE || 'development',
      sessionId: getSessionId(),
      userId: currentUserId,
      userName: currentUserName,
      logLevel: 'warn',
      severity: isSlow ? 'warning' : 'info',
      category: 'performance',
      performance: {
        duration,
        operation,
      },
      ...context,
    };

    if (originalConsole) {
      originalConsole.warn('Performance:', errorLog);
    } else {
      console.warn('Performance:', errorLog);
    }

    if (isSlow) {
      addToErrorQueue(errorLog);
      sendErrorToService(errorLog).catch(() => {
        // Ignore
      });
    }
  }
}

/**
 * Wrap async function with performance and error logging
 */
export function withPerformanceLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string,
  context?: string
): T {
  return (async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      logPerformance(operationName, duration, { context, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logPerformance(operationName, duration, { context, success: false });
      logError(error instanceof Error ? error : new Error(String(error)), {
        functionName: fn.name,
        context,
        operation: operationName,
        performance: { duration, operation: operationName },
      });
      throw error;
    }
  }) as T;
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

  // Handle online/offline events
  window.addEventListener('online', () => {
    // Try to flush error queue when connection is restored
    flushErrorQueue();
  });

  // Flush error queue periodically (every 30 seconds)
  setInterval(() => {
    if (navigator.onLine && getErrorQueue().length > 0) {
      flushErrorQueue();
    }
  }, 30000);

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    if (navigator.onLine) {
      // Use sendBeacon for more reliable delivery
      const queue = getErrorQueue();
      if (queue.length > 0) {
        try {
          const data = JSON.stringify({ batch: true, errors: queue });
          navigator.sendBeacon('/api/log-error', new Blob([data], { type: 'application/json' }));
        } catch {
          // Ignore
        }
      }
    }
  });

  // Log when error handlers are initialized (only in development, using original console to avoid interception)
  if (import.meta.env.DEV && originalConsole) {
    originalConsole.log('Error handlers initialized');
  }
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

