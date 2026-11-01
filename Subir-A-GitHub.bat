@echo off
title Subir Xander Pro a GitHub
color 0b
echo ========================================================
echo         PUBLICAR XANDER PRO EN GITHUB
echo ========================================================
echo.
echo 1. En tu navegador entra a: https://github.com/new
echo 2. Escribe el nombre del repositorio (ejemplo: xander-pro)
echo 3. NO marques "Add a README" ni .gitignore (ya estan listos)
echo 4. Haz clic en el boton verde "Create repository"
echo 5. Copia la direccion URL HTTPS de tu repositorio
echo    (Ejemplo: https://github.com/tu-usuario/xander-pro.git)
echo.
set /p REPO_URL="Pega aqui la URL de tu repositorio de GitHub y presiona Enter: "
if "%REPO_URL%"=="" goto error

echo.
echo [1/3] Conectando con el repositorio remoto...
"C:\Users\Soporte Alx\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe" -C "e:\SISTEMA DE COTIZACION" remote remove origin 2>nul
"C:\Users\Soporte Alx\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe" -C "e:\SISTEMA DE COTIZACION" remote add origin %REPO_URL%
"C:\Users\Soporte Alx\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe" -C "e:\SISTEMA DE COTIZACION" branch -M main

echo [2/3] Subiendo todos los archivos a GitHub...
"C:\Users\Soporte Alx\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe" -C "e:\SISTEMA DE COTIZACION" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [EXITO] Tu proyecto ya esta subido a GitHub!
    echo ========================================================
    echo Siguiente paso para desplegar en Vercel (1 minuto):
    echo 1. Entra a: https://vercel.com/new
    echo 2. Haz clic en "Continue with GitHub"
    echo 3. Haz clic en "Import" al lado de tu repositorio
    echo 4. Haz clic en el boton azul "Deploy"
    echo.
    echo Tu app tendra link publico HTTPS con instalador PWA automatico!
) else (
    echo.
    echo Nota: Si te pidio iniciar sesion en el navegador, autoriza a GitHub y vuelve a presionar la tecla para reintentar.
)
echo.
pause
exit

:error
echo No ingresaste la URL del repositorio. Ejecuta el archivo nuevamente.
pause
