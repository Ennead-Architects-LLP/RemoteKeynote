# Error Logging & Monitoring for Vercel

This document explains how error logging works in the application and how to monitor errors when deployed on Vercel.

## Error Handling Components

### 1. Error Boundary (`src/components/ErrorBoundary.tsx`)
- Catches React component errors
- Displays user-friendly error UI
- Logs errors automatically

### 2. Error Logger (`src/utils/errorLogger.ts`)
- Centralized error logging utility
- Handles unhandled promise rejections
- Handles unhandled errors
- Can be extended to send to external services

### 3. Global Error Handlers (`src/main.tsx`)
- Initialized on app startup
- Catches all unhandled errors globally

## How Errors Are Logged

### Development Mode
- All errors are logged to the browser console
- Error details are visible in the Error Boundary UI
- Stack traces are shown for debugging

### Production Mode (Vercel)
- Errors are logged to:
  1. **Browser Console** - Always visible in browser dev tools
  2. **Vercel Function Logs** - If using `/api/log-error` endpoint
  3. **External Services** - Can be configured (see below)

## Viewing Errors on Vercel

### Method 1: Vercel Dashboard
1. Go to your Vercel project dashboard
2. Navigate to "Functions" tab
3. View function logs for any serverless function errors
4. Check "Logs" section for runtime errors

### Method 2: Vercel CLI
```bash
vercel logs [deployment-url]
```

### Method 3: Browser Console
- Open browser DevTools (F12)
- Check Console tab for error logs
- Errors include full context (sessionId, userId, etc.)

## Setting Up External Error Tracking

### Option 1: Use the Built-in API Endpoint

The app includes an API endpoint at `/api/log-error.ts` that you can enable:

1. Uncomment the fetch call in `src/utils/errorLogger.ts`:
```typescript
await fetch('/api/log-error', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(errorLog),
});
```

2. Errors will be logged to Vercel's function logs automatically

### Option 2: Integrate Sentry

1. Install Sentry:
```bash
npm install @sentry/react
```

2. Initialize in `src/main.tsx`:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

3. Update `errorLogger.ts` to use Sentry:
```typescript
if (window.Sentry) {
  window.Sentry.captureException(error, {
    extra: errorLog,
  });
}
```

### Option 3: Integrate LogRocket

1. Install LogRocket:
```bash
npm install logrocket
```

2. Initialize and update error logger similarly

## Error Context

All errors include:
- Error message and stack trace
- Timestamp
- URL and user agent
- Session ID (if available)
- User ID (if available)
- Component/function context
- Additional custom context

## Testing Error Logging

### Test Error Boundary
1. Add a test error in a component:
```typescript
throw new Error('Test error');
```

2. Verify error is caught and logged

### Test Unhandled Errors
1. Create an unhandled promise rejection:
```typescript
Promise.reject(new Error('Test unhandled rejection'));
```

2. Verify it's logged in console

## Best Practices

1. **Always log errors with context** - Include component name, user info, etc.
2. **Don't log sensitive data** - Avoid logging passwords, tokens, etc.
3. **Use appropriate log levels** - Use console.error for errors
4. **Monitor production errors** - Set up alerts for critical errors
5. **Review logs regularly** - Check Vercel logs weekly

## Environment Variables

For external services, add to `.env`:
```
VITE_SENTRY_DSN=your_sentry_dsn
VITE_LOG_ROCKET_APP_ID=your_logrocket_id
```

## Troubleshooting

### Errors not appearing in Vercel logs?
- Check that error logging is enabled
- Verify API endpoint is deployed
- Check browser console for client-side errors

### Too many errors?
- Filter errors by type/component
- Set up error rate limiting
- Group similar errors

### Need more detail?
- Enable verbose logging in development
- Add more context to error logs
- Use source maps for better stack traces

