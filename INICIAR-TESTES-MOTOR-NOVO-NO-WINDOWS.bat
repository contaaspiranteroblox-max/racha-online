@echo off
title Racha v94 - VERSAO DE TESTES - MOTOR NOVO (as salas no motor proprio)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Falta o Node.js. Baixe em https://nodejs.org ^(versao LTS^), instale e abra este arquivo de novo.
  echo.
  pause
  exit /b
)
set RACHA_EXPERIMENTAL=1
set RACHA_MOTOR_JOGO=v94
set RACHA_SALAS_NOME=Racha v94 - motor novo
echo.
echo  RACHA v94 - VERSAO DE TESTES - MOTOR NOVO: todas as salas jogam no motor proprio (RACHA_MOTOR_JOGO=v94)
echo  No treino offline, o motor e o do painel (AJUSTES - TESTES - MOTOR).
echo.
echo  Abra no PC:      http://localhost:8080
echo  No celular:      http://IP-DESTE-PC:8080 (mesmo Wi-Fi)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo                   (IP deste PC:%%a)
echo  Na tela de login, toque em SO TREINAR OFFLINE. As salas funcionam sem conta (modo visitantes).
echo  O painel: AJUSTES - TESTES (no PC: F2). O motor novo: a parte MOTOR.
echo  Para desligar:   feche esta janela
echo.
node server.js
pause
