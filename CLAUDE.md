# CLAUDE.md

## Overview

Vite + React + TypeScript SPA for collaborative real-time spreadsheet editing of Revit keynote data. Uses Firebase Realtime Database for live synchronization between multiple users. Supports Excel file upload/parsing, inline cell editing, CSV export, and user presence tracking.

## Development Commands

```bash
npm run dev              # Vite dev server (frontend only)
npm run dev:backend      # Vercel dev (API routes)
npm run dev:full         # Both frontend + backend concurrently
npm run build            # TypeScript check + Vite build
npm run lint             # ESLint
npm run preview          # Preview production build
```

## Architecture

### Frontend (Vite SPA)

- `src/App.tsx` - main app orchestrating login, file upload, spreadsheet grid
- `src/components/SpreadsheetGrid.tsx` - AG Grid-based editable spreadsheet
- `src/components/FileUpload.tsx` - Excel file upload and parsing
- `src/components/UserLogin.tsx` - simple user identification
- `src/components/UserPresence.tsx` - shows active users in session
- `src/components/Toolbar.tsx` - toolbar actions (export, sharing, etc.)
- `src/components/ErrorDashboard.tsx` - error monitoring (Ctrl+Shift+E)

### Real-time Collaboration

- Firebase Realtime Database for live data sync
- `src/hooks/useSpreadsheet.ts` - Firebase-backed spreadsheet state management
- `src/hooks/useUserPresence.ts` - tracks active users per session
- `src/hooks/useRaceConditionHandler.ts` - handles concurrent edit conflicts
- `src/utils/sessionManager.ts` - session ID generation, shareable URL creation

### API Routes (Vercel Serverless)

- `api/log-error.ts` - error logging endpoint
- `api/test-excel-upload.ts` - Excel upload testing endpoint

### Utilities

- `src/utils/excelParser.ts` - Excel file parsing via xlsx
- `src/utils/csvExporter.ts` - CSV export
- `src/utils/errorLogger.ts` - client-side error tracking
- `src/utils/raceConditionHandler.ts` - conflict resolution logic

### Key Libraries

- AG Grid (`ag-grid-react`) - spreadsheet component
- Firebase - real-time database and sync
- xlsx - Excel file parsing

## Key Environment Variables

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

## Deployment

Deployed to Vercel as a static Vite SPA with serverless API routes. Output directory: `dist`. SPA routing via Vercel rewrites (all paths -> `index.html`). Security headers configured in `vercel.json`.
