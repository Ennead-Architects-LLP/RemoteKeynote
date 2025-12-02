# Enhanced Error Logging System

This document describes the comprehensive error logging system that captures all failures in the application.

## Features

### 1. **Comprehensive Error Capture**
- ✅ React component errors (via ErrorBoundary)
- ✅ Unhandled promise rejections
- ✅ Unhandled JavaScript errors
- ✅ Network errors (fetch failures, resource load errors)
- ✅ Event handler errors (via wrappers)
- ✅ React hook errors (useEffect, useState, etc.)
- ✅ Async operation errors
- ✅ Performance monitoring (slow operations)

### 2. **Error Classification**
- **Severity Levels**: `critical`, `error`, `warning`, `info`, `debug`
- **Categories**: `network`, `firebase`, `react`, `userAction`, `performance`, `validation`, `unknown`
- **Automatic Classification**: Errors are automatically categorized based on context

### 3. **Error Deduplication**
- Prevents duplicate error spam
- Groups similar errors within a 1-minute window
- Uses fingerprinting to identify duplicate errors

### 4. **Offline Support**
- Errors are queued in localStorage when offline
- Automatically flushed when connection is restored
- Queue persists across page reloads

### 5. **User Context Tracking**
- Automatically tracks user ID and name
- Tracks user actions for better error context
- Includes session information

### 6. **Performance Monitoring**
- Logs slow operations (>1 second)
- Tracks operation duration
- Helps identify performance bottlenecks

### 7. **Error Dashboard**
- In-app error viewer (accessible via button or `Ctrl+Shift+E` / `Cmd+Shift+E`)
- Filter by severity level
- View detailed error information
- Copy error details for debugging

## Usage

### Basic Error Logging

```typescript
import { logError } from './utils/errorLogger';

try {
  // Your code
} catch (error) {
  logError(error instanceof Error ? error : new Error(String(error)), {
    component: 'MyComponent',
    operation: 'saveData',
  });
}
```

### React Hook Error Handling

```typescript
import { useErrorHandler, useSafeEffect, useAsyncEffect } from './hooks/useErrorHandler';

function MyComponent() {
  const { handleError, wrapAsync } = useErrorHandler();

  // Safe useEffect
  useSafeEffect(() => {
    // Your effect code - errors are automatically caught
  }, [deps]);

  // Safe async useEffect
  useAsyncEffect(async () => {
    const data = await fetchData();
    // Errors are automatically caught
  }, [deps]);

  // Wrap async functions
  const saveData = wrapAsync(async (data) => {
    await api.save(data);
  }, 'saveData');
}
```

### Event Handler Wrapping

```typescript
import { useEventHandler } from './hooks/useErrorHandler';
import { wrapEventHandler } from './utils/eventHandlerWrapper';

function MyComponent() {
  // Using hook
  const handleClick = useEventHandler(() => {
    // Your handler - errors are automatically caught
  }, 'buttonClick');

  // Using utility function
  const handleSubmit = wrapEventHandler(
    (e) => {
      // Your handler
    },
    'formSubmit',
    { formId: 'myForm' }
  );
}
```

### Performance Logging

```typescript
import { withPerformanceLogging, logPerformance } from './utils/errorLogger';

// Wrap async function
const fetchData = withPerformanceLogging(
  async (id: string) => {
    return await api.getData(id);
  },
  'fetchData',
  'MyComponent'
);

// Manual performance logging
const start = performance.now();
await doSomething();
const duration = performance.now() - start;
logPerformance('doSomething', duration, { context: 'MyComponent' });
```

### User Context

```typescript
import { setUserContext, setUserAction } from './utils/errorLogger';

// Set user context (automatically done in App.tsx)
setUserContext(userId, userName);

// Track user actions
setUserAction('uploading file');
// ... perform action
setUserAction(undefined); // Clear action
```

### Error Dashboard

The error dashboard is accessible via:
- Clicking the "🐛 Errors" button in the header
- Keyboard shortcut: `Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (Mac)

Features:
- View all logged errors
- Filter by severity (All, Critical, Errors, Warnings)
- View detailed error information
- Copy error details
- Flush errors to server
- Clear error queue

## API Endpoint

The `/api/log-error` endpoint supports:

### Single Error
```json
POST /api/log-error
{
  "message": "Error message",
  "severity": "error",
  "category": "network",
  ...
}
```

### Batch Errors
```json
POST /api/log-error
{
  "batch": true,
  "errors": [
    { "message": "Error 1", ... },
    { "message": "Error 2", ... }
  ]
}
```

## Error Log Structure

```typescript
interface ErrorLog {
  id?: string;                    // Unique error ID
  message: string;                // Error message
  stack?: string;                 // Stack trace
  componentStack?: string;        // React component stack
  timestamp: string;              // ISO timestamp
  url: string;                    // Current URL
  userAgent: string;              // Browser user agent
  environment: string;            // 'development' | 'production'
  sessionId?: string;             // Session ID
  userId?: string;                // User ID
  userName?: string;              // User name
  severity?: ErrorSeverity;      // Error severity
  category?: ErrorCategory;      // Error category
  fingerprint?: string;          // For deduplication
  userAction?: string;            // What user was doing
  performance?: {                // Performance data
    duration?: number;
    operation?: string;
  };
  additionalContext?: Record<string, any>; // Custom context
}
```

## Best Practices

1. **Always log errors with context**
   ```typescript
   logError(error, {
     component: 'MyComponent',
     operation: 'saveData',
     dataId: id,
   });
   ```

2. **Use error handlers for async operations**
   ```typescript
   const saveData = wrapAsync(async (data) => {
     await api.save(data);
   }, 'saveData');
   ```

3. **Track user actions for better context**
   ```typescript
   setUserAction('uploading file');
   try {
     await uploadFile(file);
   } finally {
     setUserAction(undefined);
   }
   ```

4. **Monitor performance for slow operations**
   ```typescript
   const fetchData = withPerformanceLogging(
     async () => await api.getData(),
     'fetchData'
   );
   ```

5. **Use React error handling hooks**
   ```typescript
   useSafeEffect(() => {
     // Errors are automatically caught
   }, [deps]);
   ```

## Integration with External Services

The logging system can be extended to send errors to external services:

### Sentry
Uncomment in `src/utils/errorLogger.ts`:
```typescript
if (window.Sentry) {
  window.Sentry.captureException(new Error(errorLog.message), {
    extra: errorLog,
    level: errorLog.severity === 'critical' ? 'fatal' : errorLog.severity,
  });
}
```

### LogRocket
Uncomment in `src/utils/errorLogger.ts`:
```typescript
if (window.LogRocket) {
  window.LogRocket.captureException(new Error(errorLog.message), {
    tags: {
      severity: errorLog.severity,
      category: errorLog.category,
    },
  });
}
```

## Monitoring

### Development
- All errors are logged to browser console
- Error dashboard shows all errors
- Performance warnings for slow operations

### Production
- Errors are sent to `/api/log-error` endpoint
- Visible in Vercel function logs
- Error queue persists in localStorage
- Automatic retry when connection is restored

## Troubleshooting

### Errors not appearing in dashboard?
- Check browser console for errors
- Verify error queue in localStorage: `localStorage.getItem('errorQueue')`
- Check network tab for failed API calls

### Too many duplicate errors?
- Deduplication window is 1 minute
- Adjust `ERROR_DEDUP_WINDOW` in `errorLogger.ts` if needed

### Performance issues?
- Check performance logs in error dashboard
- Look for operations taking >1 second
- Use `withPerformanceLogging` to identify slow operations

## Future Enhancements

Potential improvements:
- Error analytics dashboard
- Error grouping by fingerprint
- Email/Slack alerts for critical errors
- Error rate limiting
- Custom error filters
- Error search functionality

