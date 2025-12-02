# RemoteKeynote

A collaborative Excel editor web application with real-time editing, auto-save, and CSV export capabilities.

## 🚀 Quick Links

- **[🌐 Live Demo](https://enneadtab-remote-keynote.vercel.app/)** - Try the app now!
- **[📖 Documentation](#setup)** - Setup instructions below
- **[🔧 Tech Stack](#tech-stack)** - Technologies used
- **[📦 Deploy](#deploy-to-vercel)** - Deployment guide

## Live Demo

- **App URL**: [https://enneadtab-remote-keynote.vercel.app/](https://enneadtab-remote-keynote.vercel.app/)

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

4. Open your browser and navigate to [http://localhost:5173](http://localhost:5173)

## Build for Production

```bash
npm run build
```

## Deploy to Vercel

The project is configured for Vercel deployment. Simply connect your repository to [Vercel](https://vercel.com/) and it will automatically build and deploy.

**Quick Deploy:**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Ennead-Architects-LLP/RemoteKeynote)

## Tech Stack

- **[React](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)** - Frontend framework
- **[Vite](https://vitejs.dev/)** - Build tool and dev server
- **[AG Grid](https://www.ag-grid.com/)** Community Edition - Spreadsheet grid component
- **[Firebase Realtime Database](https://firebase.google.com/products/realtime-database)** - Real-time data synchronization
- **[SheetJS (xlsx.js)](https://sheetjs.com/)** - Excel file parsing
- **[Vercel](https://vercel.com/)** Serverless Functions - Backend API
- **[Concurrently](https://www.npmjs.com/package/concurrently)** - Run multiple dev servers

## Development Notes

- **Backend API**: Serverless functions are located in the `/api` directory and run locally using [Vercel CLI](https://vercel.com/docs/cli)
- **Environment Variables**: Required Firebase configuration variables must be set in `.env` file
  - Get Firebase credentials from [Firebase Console](https://console.firebase.google.com/)
  - See [Firebase Setup Guide](https://firebase.google.com/docs/web/setup) for details

## Additional Resources

- **[Firebase Documentation](https://firebase.google.com/docs)**
- **[Vercel Documentation](https://vercel.com/docs)**
- **[React Documentation](https://react.dev/)**
- **[AG Grid Documentation](https://www.ag-grid.com/react-data-grid/)**

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available for use.

---
*Last updated: December 2024*