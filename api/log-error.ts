/**
 * Enhanced Vercel Serverless Function for logging errors and all console output
 * Supports both single errors and batch processing
 * All logs from the client will appear in Vercel's function logs
 */

interface ErrorLogEntry {
  id?: string;
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
  logLevel?: 'error' | 'warn' | 'info' | 'log' | 'debug';
  severity?: 'critical' | 'error' | 'warning' | 'info' | 'debug';
  category?: string;
  fingerprint?: string;
  userAction?: string;
  performance?: {
    duration?: number;
    operation?: string;
  };
  additionalContext?: Record<string, any>;
  logData?: any[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    
    // Handle batch errors
    if (body.batch && Array.isArray(body.errors)) {
      const errors = body.errors as ErrorLogEntry[];
      const processed = errors.length;
      const criticalCount = errors.filter((e) => e.severity === 'critical').length;
      const errorCount = errors.filter((e) => e.severity === 'error').length;
      
      console.log(`[BATCH] Processing ${processed} errors (${criticalCount} critical, ${errorCount} errors)`);
      
      // Log each error
      errors.forEach((logData) => {
        logErrorEntry(logData);
      });
      
      // Log summary
      console.log(`[BATCH] Successfully processed ${processed} errors`);
      
      return res.status(200).json({ 
        success: true, 
        processed,
        critical: criticalCount,
        errors: errorCount,
      });
    }
    
    // Handle single error
    const logData = body as ErrorLogEntry;
    logErrorEntry(logData);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in log-error endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function logErrorEntry(logData: ErrorLogEntry) {
  const logLevel = logData.logLevel || (logData.severity === 'critical' || logData.severity === 'error' ? 'error' : 'warn');
  const timestamp = logData.timestamp || new Date().toISOString();
  
  // Format log message with context
  const severityLabel = logData.severity ? `[${logData.severity.toUpperCase()}]` : '';
  const categoryLabel = logData.category ? `[${logData.category.toUpperCase()}]` : '';
  const logMessage = `[${timestamp}] ${severityLabel} ${categoryLabel} ${logData.message || 'No message'}`;
  
  // Enhanced log entry with all context
  const logEntry = {
    message: logMessage,
    level: logLevel,
    severity: logData.severity,
    category: logData.category,
    fingerprint: logData.fingerprint,
    stack: logData.stack,
    componentStack: logData.componentStack,
    url: logData.url,
    userAgent: logData.userAgent,
    environment: logData.environment,
    sessionId: logData.sessionId,
    userId: logData.userId,
    userName: logData.userName,
    userAction: logData.userAction,
    performance: logData.performance,
    context: logData.additionalContext,
    logData: logData.logData,
  };

  // Log with appropriate level based on severity
  const severity = logData.severity || 'error';
  
  switch (severity) {
    case 'critical':
      console.error(JSON.stringify(logEntry, null, 2));
      // In production, you might want to send alerts for critical errors
      // Example: Send email, Slack notification, etc.
      break;
    case 'error':
      console.error(JSON.stringify(logEntry, null, 2));
      break;
    case 'warning':
      console.warn(JSON.stringify(logEntry, null, 2));
      break;
    case 'info':
      console.info(JSON.stringify(logEntry, null, 2));
      break;
    case 'debug':
      console.debug(JSON.stringify(logEntry, null, 2));
      break;
    default:
      // Fallback to logLevel
      switch (logLevel) {
        case 'error':
          console.error(JSON.stringify(logEntry, null, 2));
          break;
        case 'warn':
          console.warn(JSON.stringify(logEntry, null, 2));
          break;
        case 'info':
          console.info(JSON.stringify(logEntry, null, 2));
          break;
        case 'debug':
          console.debug(JSON.stringify(logEntry, null, 2));
          break;
        default:
          console.log(JSON.stringify(logEntry, null, 2));
      }
  }

  // Optionally, you could:
  // 1. Store in a database (Firebase, MongoDB, etc.)
  // 2. Send to an external service (Sentry, LogRocket, etc.)
  // 3. Send email alerts for critical errors
  // 4. Aggregate errors by fingerprint for analytics

  // Example: Send to external service
  // if (process.env.SENTRY_DSN && (severity === 'critical' || severity === 'error')) {
  //   await sendToSentry(logData);
  // }
}

