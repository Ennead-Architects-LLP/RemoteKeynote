import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initializeErrorHandlers, flushErrorQueue } from './utils/errorLogger.ts'
import './index.css'

// Initialize global error handlers
initializeErrorHandlers();

// Flush any pending errors from previous session
if (navigator.onLine) {
  flushErrorQueue().catch(() => {
    // Ignore errors during initialization
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
