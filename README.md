# RemoteKeynote

A collaborative Excel editor web application with real-time editing, auto-save, and CSV export capabilities.

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

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from `.env.example` and add your Firebase configuration:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

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