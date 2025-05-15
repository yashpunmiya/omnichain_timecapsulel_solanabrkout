@echo off
echo Installing dependencies for the Omnichain Time Capsule DApp...
echo.
echo This may take a few minutes. Please wait...
echo.

echo Installing root dependencies...
npm install --legacy-peer-deps

echo.
echo Installing frontend dependencies...
cd frontend
npm install --legacy-peer-deps

echo.
echo All dependencies have been installed!
echo.
echo To start the frontend, run start-frontend.bat 