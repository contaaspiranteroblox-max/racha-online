'use strict';
/* RACHA v103 · os ganchos SÓ DE TESTE (tests/ganchos_teste.cjs: __teste_gol, __teste_poe) no servidor da turma de verdade, COM a
   conta obrigatória (o servidor_visitantes.cjs tira a conta). Uso: node -r tests/ganchos_teste_pre.cjs server/servidor.js ...
   O v83 sobe assim: desde a v103 as salas online não têm bots, e o fim da partida (a meta de 3) vem pelos gols do gancho. */
require('./ganchos_teste.cjs').liga(require('../server/turma').Turma);
