'use strict';
/* Testes (arnês da v84): o servidor da turma DE VERDADE — server/servidor.js, com as mesmas opções de linha de comando —,
   só que a turma é criada com exigeConta:false (aceita quem joga sem conta, como antes da v84). Os testes do online
   escritos antes do login obrigatório (online, v79, v80, v81 e a parte "pela rede" do servidor_test) sobem este arquivo.
   O padrão do produto não muda: o server/servidor.js continua recusando quem não tem conta (ver o servidor_test, parte 0).
   Uso: node tests/servidor_visitantes.cjs --porta N --memoria ...   (as opções do servidor.js) */
// v93: os testes escritos antes da contagem (3, 2, 1, JÁ!) e do replay online começam na hora e sem o replay; os da v93 ligam
if (process.env.RACHA_CONTAGEM_MS == null) process.env.RACHA_CONTAGEM_MS = '0';
if (process.env.RACHA_REPLAY == null) process.env.RACHA_REPLAY = '0';
const turma = require('../server/turma');
const Original = turma.Turma;
turma.Turma = class TurmaComVisitantes extends Original {
  constructor(o){ super(Object.assign({}, o, {exigeConta:false})); }
};
require('./ganchos_teste.cjs').liga(turma.Turma);   // v88: o teste pede gols ao motor de verdade (só nos testes; ver o arquivo)
require('../server/servidor.js');
