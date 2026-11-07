@echo off
title Paperclip - Cloudflare Pages Deploy
echo ===================================================
echo   PAPERCLIP - CLOUDFLARE PAGES DEPLOY
echo ===================================================
echo.
echo [1/2] Building production frontend bundle (ui/dist)...
call pnpm.cmd --filter @paperclipai/ui build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Deploying to Cloudflare Pages (paperclip-control-plane)...
echo (If this is your first time, a browser window may open to log into Cloudflare)
echo.
call npx.cmd wrangler pages deploy ui/dist --project-name paperclip-control-plane --branch main

echo.
echo ===================================================
echo   DEPLOYMENT COMPLETE!
echo   Live URL: https://paperclip-control-plane.pages.dev
echo ===================================================
pause
