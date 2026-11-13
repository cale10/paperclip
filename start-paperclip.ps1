# Start Paperclip Server & UI
Set-Location -Path $PSScriptRoot

Write-Host "Syncing local projects from Y:\Local Projects..." -ForegroundColor DarkCyan
node --import ./server/node_modules/tsx/dist/loader.mjs scripts/sync-local-projects.ts

Write-Host "Starting Paperclip (Server on :3100, UI on :5173)..." -ForegroundColor Cyan
pnpm.cmd dev
