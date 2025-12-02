@echo off
REM Run Server Batch File
REM This will attempt to start the Vite dev server

echo Starting RemoteKeynote dev server...
echo.

REM Try to find and use npm
where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Found npm in PATH
    npm run dev
    goto :end
)

REM Try common Node.js installation paths
if exist "C:\Program Files\nodejs\npm.cmd" (
    echo Found npm at: C:\Program Files\nodejs\npm.cmd
    "C:\Program Files\nodejs\npm.cmd" run dev
    goto :end
)

if exist "%APPDATA%\npm\npm.cmd" (
    echo Found npm at: %APPDATA%\npm\npm.cmd
    "%APPDATA%\npm\npm.cmd" run dev
    goto :end
)

if exist "%LOCALAPPDATA%\Programs\nodejs\npm.cmd" (
    echo Found npm at: %LOCALAPPDATA%\Programs\nodejs\npm.cmd
    "%LOCALAPPDATA%\Programs\nodejs\npm.cmd" run dev
    goto :end
)

REM Try custom local Node.js path
if exist "C:\Users\szhang\github\node\npm.cmd" (
    echo Found npm at: C:\Users\szhang\github\node\npm.cmd
    "C:\Users\szhang\github\node\npm.cmd" run dev
    goto :end
)

REM Try portable Node.js path
if exist "C:\Users\szhang\github\portable_node\npm.cmd" (
    echo Found npm at: C:\Users\szhang\github\portable_node\npm.cmd
    set PATH=%PATH%;C:\Users\szhang\github\portable_node
    "C:\Users\szhang\github\portable_node\npm.cmd" run dev
    goto :end
)

echo ERROR: npm not found!
echo.
echo Please ensure Node.js is installed and added to your PATH.
echo You can download Node.js from: https://nodejs.org/
echo.
echo Alternatively, open a new terminal/command prompt where Node.js is available
echo and run: npm run dev
echo.
pause

:end

