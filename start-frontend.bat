@echo off
echo Starting the Time Capsule DApp frontend...
cd frontend
set BROWSER=none
set PORT=3000
set GENERATE_SOURCEMAP=false
set NODE_OPTIONS=--openssl-legacy-provider
npm start 