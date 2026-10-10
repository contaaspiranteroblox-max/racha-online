@echo off
title Racha - servidor das salas
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
echo  No celular:      use o endereco "no celular" que aparece logo abaixo (mesmo Wi-Fi)
echo  Para desligar:   feche esta janela
echo.
node server.js
pause
