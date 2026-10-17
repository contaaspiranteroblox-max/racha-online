#!/usr/bin/env node
'use strict';
/* RACHA · o atalho do site de teste ("node server.js": o Render, o Docker e o INICIAR-NO-WINDOWS.bat usam este).
   Sobe o servidor de verdade da v85 (server/servidor.js: entrega o jogo de app/public e as salas no mesmo endereço) com o
   MODO VISITANTES ligado: o site de teste não tem a plataforma de contas (o banco MySQL) no ar e, desde a v84, o servidor
   só deixa entrar nas salas quem tem conta. Para exigir a conta (com a plataforma no ar), defina RACHA_VISITANTES=0. */
if (process.env.RACHA_VISITANTES === undefined) process.env.RACHA_VISITANTES = '1';
require('./server/servidor.js');
