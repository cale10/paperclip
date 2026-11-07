# Start Paperclip Server & UI
Set-Location -Path $PSScriptRoot
Write-Host "Starting Paperclip (Server on :3100, UI on :5173)..." -ForegroundColor Cyan
pnpm.cmd dev
