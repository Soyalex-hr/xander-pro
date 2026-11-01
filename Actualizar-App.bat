@echo off
title Actualizar Xander Pro en la Web y Vercel
color 0a
echo ========================================================
echo         PUBLICAR ACTUALIZACION EN VERCEL
echo ========================================================
echo.
echo Este asistente guardara todos los cambios que hayas hecho
echo en tu proyecto y los subira a GitHub. Vercel actualizara
echo tu pagina web automaticamente en 15 segundos.
echo.
set /p MSG="Que cambiaste? (Escribe una nota breve o presiona Enter): "
if "%MSG%"=="" set MSG=Actualizacion automatica %date% %time%

echo.
echo [1/3] Detectando archivos modificados...
"C:\Users\Soporte Alx\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe" -C "e:\SISTEMA DE COTIZACION" add .

echo [2/3] Empaquetando mejoras...
"C:\Users\Soporte Alx\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe" -C "e:\SISTEMA DE COTIZACION" commit -m "%MSG%"

echo [3/3] Enviando a Vercel a traves de GitHub...
"C:\Users\Soporte Alx\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe" -C "e:\SISTEMA DE COTIZACION" push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [EXITO TOTAL] Actualizacion publicada con exito!
    echo ========================================================
    echo Tu app en vivo se esta actualizando ahora mismo:
    echo https://xander-pro-o33o.vercel.app
    echo.
    echo En unos 15 segundos todos tus clientes y usuarios
    echo veran los cambios reflejados.
) else (
    echo.
    echo Hubo un problema de conexion o permisos con GitHub.
)
echo.
pause
