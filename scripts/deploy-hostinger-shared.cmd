@echo off
REM Deploy to the Hostinger shared-hosting Node.js app (jamhawi.com) over SSH/SCP.
REM Requires PuTTY's plink.exe / pscp.exe (auth is password-based, not key-based).
REM
REM Usage:
REM   set HOSTINGER_SSH_PASSWORD=...
REM   scripts\deploy-hostinger-shared.cmd [--skip-build]
setlocal enabledelayedexpansion

set "HOST=77.37.37.232"
set "PORT=65002"
set "SSH_USER=u238610321"
set "REMOTE_APP_DIR=domains/jamhawi.com/nodejs"
set "REMOTE_NODE_BIN=/opt/alt/alt-nodejs24/root/usr/bin"
set "HEALTH_URL=https://jamhawi.com/health"
REM Pins the server's host key so plink/pscp trust it non-interactively
REM instead of showing the "store key in cache?" prompt (which a piped
REM "echo y" can't reliably answer and aborts the connection).
set "HOSTKEY=SHA256:izq+BXpKyqyV/3+6MdcNif+isM53y0Brir9Src/0mwE"
set "HOSTINGER_SSH_PASSWORD=O>9zMnP@bo"

set "REPO_ROOT=%~dp0.."
pushd "%REPO_ROOT%"

if "%HOSTINGER_SSH_PASSWORD%"=="" (
  echo error: HOSTINGER_SSH_PASSWORD is not set. >&2
  echo   set HOSTINGER_SSH_PASSWORD=... ^&^& scripts\deploy-hostinger-shared.cmd >&2
  popd
  exit /b 1
)

set "PSCP=pscp"
where pscp >nul 2>nul || set "PSCP=C:\Program Files\PuTTY\pscp.exe"
set "PLINK=plink"
where plink >nul 2>nul || set "PLINK=C:\Program Files\PuTTY\plink.exe"

if "%~1"=="--skip-build" (
  echo ==^> Skipping build, using newest existing archive
) else (
  echo ==^> Building deploy archive ^(npm run build:archive^)
  call npm run build:archive
  if errorlevel 1 (
    popd
    exit /b 1
  )
)

set "ARCHIVE="
for /f "delims=" %%F in ('dir /b /o-d "releases\jamhawi_deploy_v*.zip" 2^>nul') do (
  if not defined ARCHIVE set "ARCHIVE=releases\%%F"
)
if not defined ARCHIVE (
  echo error: no releases\jamhawi_deploy_v*.zip found. Run without --skip-build first. >&2
  popd
  exit /b 1
)
echo ==^> Using archive: %ARCHIVE%

echo ==^> Uploading archive to %SSH_USER%@%HOST%:~/jamhawi_deploy.zip
"%PSCP%" -P %PORT% -hostkey "%HOSTKEY%" -pw "%HOSTINGER_SSH_PASSWORD%" "%ARCHIVE%" %SSH_USER%@%HOST%:~/jamhawi_deploy.zip
if errorlevel 1 (
  popd
  exit /b 1
)

if exist ".env.hostinger" (
  echo ==^> Uploading .env.hostinger to %REMOTE_APP_DIR%/.env.hostinger
  "%PSCP%" -P %PORT% -hostkey "%HOSTKEY%" -pw "%HOSTINGER_SSH_PASSWORD%" ".env.hostinger" %SSH_USER%@%HOST%:%REMOTE_APP_DIR%/.env.hostinger
  if errorlevel 1 (
    popd
    exit /b 1
  )
) else (
  echo warning: .env.hostinger not found locally -- server/start.js will fall back to cPanel env vars. >&2
)

echo ==^> Extracting, installing, building, and restarting on the server
"%PLINK%" -P %PORT% -hostkey "%HOSTKEY%" -pw "%HOSTINGER_SSH_PASSWORD%" %SSH_USER%@%HOST% "cd %REMOTE_APP_DIR% && unzip -o ~/jamhawi_deploy.zip && export PATH=%REMOTE_NODE_BIN%:$PATH && npm install && npm run build && touch tmp/restart.txt"
if errorlevel 1 (
  popd
  exit /b 1
)

echo ==^> Waiting for Passenger to reload
timeout /t 8 /nobreak >nul
echo ==^> Health check: %HEALTH_URL%
curl -s "%HEALTH_URL%"
echo.

popd
endlocal
