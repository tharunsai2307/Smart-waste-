@echo off
setlocal

REM Resolve directory and strip trailing backslash
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

cd /d "%ROOT_DIR%"

title Smart Waste Management System - Launcher
echo ========================================================
echo   SMART WASTE MANAGEMENT SYSTEM - LOCAL LAUNCHER
echo ========================================================
echo Project Directory: %ROOT_DIR%
echo.

REM Clean up any old running backend instances to prevent port 8080 conflict
taskkill /F /IM server.exe >nul 2>&1

echo [1/3] Building latest C backend engine...
python -c "import glob, subprocess; files = [f for f in glob.glob('src/*.c') if 'migrate' not in f]; subprocess.run(['gcc', '-Iinclude', '-o', 'server.exe'] + files + ['-lws2_32'])"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to compile server.exe.
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Backend binary (server.exe) ready.
echo.

echo [2/3] Starting backend server on http://localhost:8080...
start "Smart Waste Backend" /D "%ROOT_DIR%" cmd /k "server.exe"

echo [3/3] Starting frontend server on http://localhost:3000...
start "Smart Waste Frontend" /D "%ROOT_DIR%\frontend" cmd /k "npm.cmd run dev -- --host"

echo.
echo ========================================================
echo   SERVICES RUNNING:
echo   - Frontend App : http://localhost:3000
echo   - Frontend Alt : http://127.0.0.1:3000
echo   - Backend API  : http://localhost:8080
echo ========================================================
echo.
echo Opening browser in 3 seconds...
ping 127.0.0.1 -n 4 >nul
start http://localhost:3000
