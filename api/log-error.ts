/**
 * Vercel Serverless Function for logging errors and all console output
 * All logs from the client will appear in Vercel's function logs
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const logData = req.body;
    const logLevel = logData.logLevel || 'error';
    const timestamp = logData.timestamp || new Date().toISOString();
    
    // Format log message with context
    const logMessage = `[${timestamp}] [${logLevel.toUpperCase()}] ${logData.message || 'No message'}`;
    
    // Log to Vercel's function logs (visible in Vercel dashboard)
    // Use appropriate console method based on log level
    const logEntry = {
      message: logMessage,
      level: logLevel,
      stack: logData.stack,
      componentStack: logData.componentStack,
      url: logData.url,
      userAgent: logData.userAgent,
      environment: logData.environment,
      sessionId: logData.sessionId,
      userId: logData.userId,
      context: logData.additionalContext,
      logData: logData.logData,
    };

    // Log with appropriate level
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

    // Optionally, you could:
    // 1. Store in a database
    // 2. Send to an external service (Sentry, LogRocket, etc.)
    // 3. Send email alerts for critical errors
    // 4. Store in Vercel's environment variables for API keys

    // Example: Send to external service
    // if (process.env.SENTRY_DSN) {
    //   await sendToSentry(logData);
    // }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in log-error endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

