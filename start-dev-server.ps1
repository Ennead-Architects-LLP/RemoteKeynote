# Start Dev Server Script
# This script will start the Vite dev server (frontend only)
# For full setup with virtual environment and both frontend/backend, use setup-and-run.ps1

Write-Host "Starting RemoteKeynote frontend dev server..." -ForegroundColor Green

# Check if virtual environment exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Virtual environment (node_modules) not found. Please run 'npm install' first." -ForegroundColor Red
    Write-Host "Or use 'setup-and-run.ps1' for automatic setup." -ForegroundColor Yellow
    exit 1
}

# Try to find npm in common locations
$npmPaths = @(
    "C:\Program Files\nodejs\npm.cmd",
    "$env:APPDATA\npm\npm.cmd",
    "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd",
    "C:\Users\szhang\github\node\npm.cmd"
)

$npmFound = $false
foreach ($path in $npmPaths) {
    if (Test-Path $path) {
        Write-Host "Found npm at: $path" -ForegroundColor Yellow
        & $path run dev
        $npmFound = $true
        break
    }
}

if (-not $npmFound) {
    Write-Host "npm not found in common locations. Trying to use npm from PATH..." -ForegroundColor Yellow
    try {
        npm run dev
    } catch {
        Write-Host "Error: npm is not available. Please ensure Node.js is installed and added to your PATH." -ForegroundColor Red
        Write-Host "You can download Node.js from: https://nodejs.org/" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Alternatively, if Node.js is installed, please:" -ForegroundColor Yellow
        Write-Host "1. Open a new terminal/command prompt" -ForegroundColor Yellow
        Write-Host "2. Navigate to this directory: $PWD" -ForegroundColor Yellow
        Write-Host "3. Run: npm run dev" -ForegroundColor Yellow
        exit 1
    }
}

