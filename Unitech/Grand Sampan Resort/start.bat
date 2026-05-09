@echo off
echo Starting Backend...
start cmd /k "cd backend && npm install && npm run build && npm run start"

echo Starting Frontend...
start cmd /k "cd frontend && npm install && npm run build && npm run dev"

echo Both services are starting in separate windows.
