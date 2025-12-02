/**
 * Vercel Serverless Function for logging errors
 * This endpoint can be used to log errors server-side
 * 
 * To use this, uncomment the fetch call in errorLogger.ts
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const errorLog = req.body;

    // Log to Vercel's function logs (visible in Vercel dashboard)
    console.error('Error logged from client:', JSON.stringify(errorLog, null, 2));

    // Optionally, you could:
    // 1. Store in a database
    // 2. Send to an external service (Sentry, LogRocket, etc.)
    // 3. Send email alerts for critical errors
    // 4. Store in Vercel's environment variables for API keys

    // Example: Send to external service
    // if (process.env.SENTRY_DSN) {
    //   await sendToSentry(errorLog);
    // }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in log-error endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

