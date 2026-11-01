@echo off
title Xander Pro PWA Launcher

:: Iniciar servidor local PWA en segundo plano
start "" /min powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0server.ps1"

:: Pausa breve para enlace del puerto
timeout /t 1 >nul

:: Abrir en Google Chrome como Aplicacion de Escritorio
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://localhost:8080/index.html"
) else (
    start "" "http://localhost:8080/index.html"
)
exit
