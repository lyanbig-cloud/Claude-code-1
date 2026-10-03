@echo off
REM Doble clic para abrir el panel (Windows). Deja esta ventana abierta mientras lo uses.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Falta Node.js. Descargalo ^(version LTS^) de https://nodejs.org, instalalo y vuelve a abrir este archivo.
  pause
  exit /b 1
)

if not exist .env (
  copy .env.example .env >nul
  echo Cree el archivo .env. Pega tu API key de Higgsfield en el, guardalo y vuelve a abrir este archivo.
  notepad .env
  pause
  exit /b 0
)

node server.js --abrir
pause
