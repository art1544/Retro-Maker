@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ============================================
echo   RetroMaker - limpeza e instalacao (Windows)
echo ============================================
echo.

echo [1/4] Removendo node_modules corrompidos (se existirem)...
for %%D in ("server\node_modules" "client\node_modules") do (
  if exist "%%~D" (
    echo   - %%~D
    takeown /f "%%~D" /r /d s >nul 2>&1
    icacls "%%~D" /grant "%USERNAME%":F /t /c >nul 2>&1
    attrib -r -s -h "%%~D\*.*" /s /d >nul 2>&1
    rmdir /s /q "%%~D" >nul 2>&1
    if exist "%%~D" powershell -NoProfile -Command "Remove-Item -LiteralPath '%%~D' -Recurse -Force -ErrorAction SilentlyContinue" >nul 2>&1
  )
)
for %%F in ("server\package-lock.json" "client\package-lock.json" "_probe.txt") do (
  if exist "%%~F" del /f /q "%%~F" >nul 2>&1
)
echo.

echo [2/4] Instalando dependencias da raiz...
call npm install --no-audit --no-fund
if errorlevel 1 goto :err

echo.
echo [3/4] Instalando dependencias do server...
pushd server
call npm install --no-audit --no-fund
if errorlevel 1 ( popd & goto :err )
popd

echo.
echo [4/4] Instalando dependencias do client...
pushd client
call npm install --no-audit --no-fund
if errorlevel 1 ( popd & goto :err )
popd

echo.
echo ============================================
echo   Pronto! Agora rode:   npm run dev
echo   E abra:  http://localhost:5173
echo ============================================
pause
exit /b 0

:err
echo.
echo *** Algo falhou. Se o erro foi de permissao (EPERM) ao remover node_modules,
echo *** feche editores/terminais que usem a pasta e rode este setup.bat como Administrador.
pause
exit /b 1
