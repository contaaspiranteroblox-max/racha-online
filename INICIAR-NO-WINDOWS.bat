@echo off
title Racha - servidor do jogo
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Falta o Node.js. Baixe em https://nodejs.org ^(versao LTS^), instale e abra este arquivo de novo.
  echo.
  pause
  exit /b
)
echo.
echo  Abra no PC:      http://localhost:8080
echo  No celular:      http://IP-DESTE-PC:8080 (mesmo Wi-Fi)
echo  Na tela de login, toque em SO TREINAR OFFLINE. As salas funcionam sem conta (modo visitantes).
echo  Para desligar:   feche esta janela
echo.
node server.js
pause
