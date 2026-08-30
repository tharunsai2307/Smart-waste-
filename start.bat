@echo off
echo Starting Smart Waste Management System...

REM Start the C backend server
echo Starting backend server on port 8080...
start "Backend Server" cmd /c "server.exe || pause"

REM Start the React frontend server
echo Starting frontend server on port 3000...
cd frontend
start "Frontend Server" cmd /c "npm run dev || pause"
cd ..

echo Both servers are starting in separate windows.
