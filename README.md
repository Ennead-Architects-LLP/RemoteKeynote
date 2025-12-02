# RemoteKeynote

A collaborative Excel editor web application with real-time editing, auto-save, and CSV export capabilities.

## Live Demo

- **App URL**: `https://enneadtab-remote-keynote.vercel.app/`

## Features

- 📊 Upload and edit Excel files
- 👥 Real-time collaborative editing
- 💾 Auto-save functionality
- 📥 Download as CSV
- 🎨 Modern dark theme with purple accent
- 🔔 On-screen notifications
- 🎯 User presence indicators

## Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)

## Setup

1. Install dependencies (sets up virtual environment with isolated node_modules):
```bash
npm install
```

2. Create a `.env` file from `.env.example` and add your Firebase configuration:
```bash
cp .env.example .env
```

3. Start the development servers:

   **Option A: Run both frontend and backend together (recommended):**
   ```bash
   npm run dev:full
   ```
   This starts:
   - Frontend dev server at `http://localhost:5173`
   - Backend API serverless functions at `http://localhost:3000`

   **Option B: Run frontend only:**
   ```bash
   npm run dev
   ```

   **Option C: Run backend only:**
   ```bash
   npm run dev:backend
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Using PowerShell Scripts (Windows)

For automated setup and running:
```powershell
.\setup-and-run.ps1
```

This script will:
- Check and install dependencies if needed (virtual environment setup)
- Provide options to run frontend, backend, or both

## Build for Production

```bash
npm run build
```

## Deploy to Vercel

The project is configured for Vercel deployment. Simply connect your repository to Vercel and it will automatically build and deploy.

## Tech Stack

- React + TypeScript
- Vite
- AG Grid Community Edition
- Firebase Realtime Database
- SheetJS (xlsx.js)
- Vercel Serverless Functions (for backend API)
- Concurrently (for running multiple dev servers)

## Development Notes

- **Virtual Environment**: Node.js uses `node_modules` as the virtual environment, isolating project dependencies
- **Backend API**: Serverless functions are located in the `/api` directory and run locally using Vercel CLI
- **Environment Variables**: Required Firebase configuration variables must be set in `.env` file