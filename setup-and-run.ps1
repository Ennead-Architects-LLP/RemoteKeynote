# Setup and Run Script for RemoteKeynote
# This script sets up the virtual environment (node_modules) and runs both frontend and backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RemoteKeynote - Setup and Run" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists (virtual environment)
if (-not (Test-Path "node_modules")) {
    Write-Host "Virtual environment (node_modules) not found. Installing dependencies..." -ForegroundColor Yellow
    
    # Try to find npm
    $npmPaths = @(
        "C:\Program Files\nodejs\npm.cmd",
        "$env:APPDATA\npm\npm.cmd",
        "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd"
    )
    
    $npmFound = $false
    foreach ($path in $npmPaths) {
        if (Test-Path $path) {
            Write-Host "Found npm at: $path" -ForegroundColor Green
            Write-Host "Installing dependencies (this may take a few minutes)..." -ForegroundColor Yellow
            & $path install
            $npmFound = $true
            break
        }
    }
    
    if (-not $npmFound) {
        Write-Host "npm not found. Trying to use npm from PATH..." -ForegroundColor Yellow
        try {
            npm install
            $npmFound = $true
        } catch {
            Write-Host "Error: npm is not available. Please ensure Node.js is installed and added to your PATH." -ForegroundColor Red
            Write-Host "You can download Node.js from: https://nodejs.org/" -ForegroundColor Yellow
            exit 1
        }
    }
    
    if ($npmFound) {
        Write-Host "Dependencies installed successfully!" -ForegroundColor Green
        Write-Host ""
    }
} else {
    Write-Host "Virtual environment (node_modules) found." -ForegroundColor Green
    Write-Host ""
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Firebase configuration may be missing." -ForegroundColor Yellow
    Write-Host "The app may not work properly without Firebase configuration." -ForegroundColor Yellow
    Write-Host ""
}

# Ask user which mode to run
Write-Host "Select run mode:" -ForegroundColor Cyan
Write-Host "1. Frontend only (Vite dev server)" -ForegroundColor White
Write-Host "2. Backend only (Vercel serverless functions)" -ForegroundColor White
Write-Host "3. Both frontend and backend (recommended)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter choice (1-3) [default: 3]"

if ([string]::IsNullOrWhiteSpace($choice)) {
    $choice = "3"
}

# Try to find npm
$npmPaths = @(
    "C:\Program Files\nodejs\npm.cmd",
    "$env:APPDATA\npm\npm.cmd",
    "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd"
)

$npmCmd = "npm"
foreach ($path in $npmPaths) {
    if (Test-Path $path) {
        $npmCmd = $path
        break
    }
}

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Green
Write-Host ""

switch ($choice) {
    "1" {
        Write-Host "Starting frontend dev server..." -ForegroundColor Cyan
        & $npmCmd run dev
    }
    "2" {
        Write-Host "Starting backend serverless functions..." -ForegroundColor Cyan
        & $npmCmd run dev:backend
    }
    "3" {
        Write-Host "Starting both frontend and backend..." -ForegroundColor Cyan
        Write-Host "Frontend will be available at: http://localhost:5173" -ForegroundColor Yellow
        Write-Host "Backend API will be available at: http://localhost:3000" -ForegroundColor Yellow
        Write-Host ""
        & $npmCmd run dev:full
    }
    default {
        Write-Host "Invalid choice. Starting both frontend and backend..." -ForegroundColor Yellow
        & $npmCmd run dev:full
    }
}

