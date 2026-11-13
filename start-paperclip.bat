@echo off
title Paperclip Dev Server
cd /d "%~dp0"
echo Syncing local projects from Y:\Local Projects...
node --import ./server/node_modules/tsx/dist/loader.mjs scripts/sync-local-projects.ts
echo Starting Paperclip Server and UI...
pnpm dev
pause
