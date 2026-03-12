@echo off
chcp 65001 >nul 2>&1

echo ============================================
echo   RoomManager - Development Server Launcher
echo ============================================
echo.

REM --- Check if Node.js is installed ---
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 20+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM --- Display Node.js version ---
echo [INFO] Node.js version:
node --version
echo.

REM --- Check if npm is available ---
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not found. Please reinstall Node.js.
    echo.
    pause
    exit /b 1
)

REM --- Check if node_modules exists, install dependencies if not ---
if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies.
        echo Please check your network connection and try again.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed successfully.
    echo.
) else (
    echo [OK] Dependencies already installed.
    echo.
)

REM --- Check if .env file exists ---
if not exist ".env" (
    echo [INFO] .env file not found. Creating from .env.example...
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] .env file created. Edit it to add your Gemini API key.
    ) else (
        echo [WARN] .env.example not found. AI features will run in demo mode.
    )
    echo.
)

REM --- Start development server ---
echo [INFO] Starting development server...
echo [INFO] The app will open at http://localhost:5173
echo [INFO] Press Ctrl+C to stop the server.
echo.
echo ============================================
echo.

call npm run dev

echo.
echo [INFO] Server stopped.
pause

REM bymiles
