@echo off
title Subir Xander Pro a GitHub y Vercel
color 0b
echo ========================================================
echo         PUBLICAR XANDER PRO EN GITHUB Y VERCEL
echo ========================================================
echo.
echo Repositorio destino: https://github.com/Soyalex-hr/xander-pro.git
echo.
echo [1/2] Conectando y subiendo archivos a GitHub...
echo.
echo NOTA: Se abrira una ventana en tu navegador pidiendo autorizar
echo a GitHub. Haz clic en el boton verde "Authorize git-ecosystem"
echo (o inicia sesion con tu cuenta Soyalex-hr).
echo.
"C:\Users\Soporte Alx\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe" -C "e:\SISTEMA DE COTIZACION" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [EXITO TOTAL] Tus archivos ya estan en GitHub!
    echo ========================================================
    echo.
    echo Vercel detectara esta subida automaticamente y tu app
    echo estara en vivo en menos de 30 segundos.
    echo.
    echo Solo ve a tu navegador y recarga tu enlace de Vercel:
    echo https://xander-pro-o33o.vercel.app
    echo.
) else (
    echo.
    echo ========================================================
    echo Si fallo la autenticacion, puedes subirlo con GitHub Desktop:
    echo 1. Abre la app "GitHub Desktop" en tu PC
    echo 2. Inicia sesion con Soyalex-hr
    echo 3. Haz clic en "Publish repository" o "Push origin"
    echo ========================================================
)
echo.
pause
