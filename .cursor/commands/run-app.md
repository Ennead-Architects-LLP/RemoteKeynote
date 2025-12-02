# Run App Command

This command sets up a virtual environment and runs both the frontend and backend servers locally.

## Setup Virtual Environment

1. Ensure Node.js dependencies are installed in the virtual environment (node_modules):
```bash
npm install
```

2. Install Vercel CLI globally (for running serverless functions locally):
```bash
npm install -g vercel
```

Or use npx to run without global installation:
```bash
npx vercel dev
```

## Running the App

### Option 1: Run Both Frontend and Backend Together

Use the npm script:
```bash
npm run dev:full
```

This will:
- Start the Vite frontend dev server (usually on http://localhost:5173)
- Start the Vercel backend serverless functions (usually on http://localhost:3000)

### Option 2: Run Separately

**Frontend only:**
```bash
npm run dev
```

**Backend only (Vercel serverless functions):**
```bash
npm run dev:backend
```

Or manually:
```bash
vercel dev
```

## Environment Variables

Make sure you have a `.env` file with Firebase configuration:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Notes

- The virtual environment in Node.js is the `node_modules` folder, which isolates dependencies
- Vercel CLI runs serverless functions locally, simulating the production environment
- Both servers need to run simultaneously for full functionality

