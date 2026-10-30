@echo off
title Racha v94 - VERSAO DE TESTES (salas no motor de antes; o admin troca no painel)
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
set RACHA_SALAS_NOME=Racha v94 - testes
echo.
echo  RACHA v94 - VERSAO DE TESTES (o admin da sala pode mandar o motor e a fisica do painel)
echo  Para as salas ja no motor proprio, use o INICIAR-TESTES-MOTOR-NOVO-NO-WINDOWS.bat
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
