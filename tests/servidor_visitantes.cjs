'use strict';
/* Testes (arnês da v84): o servidor da turma DE VERDADE — server/servidor.js, com as mesmas opções de linha de comando —,
   só que a turma é criada com exigeConta:false (aceita quem joga sem conta, como antes da v84). Os testes do online
   escritos antes do login obrigatório (online, v79, v80, v81 e a parte "pela rede" do servidor_test) sobem este arquivo.
   O padrão do produto não muda: o server/servidor.js continua recusando quem não tem conta (ver o servidor_test, parte 0).
   Uso: node tests/servidor_visitantes.cjs --porta N --memoria ...   (as opções do servidor.js) */
const turma = require('../server/turma');
const Original = turma.Turma;
turma.Turma = class TurmaComVisitantes extends Original {
  constructor(o){ super(Object.assign({}, o, {exigeConta:false})); }
};
require('./ganchos_teste.cjs').liga(turma.Turma);   // v88: o teste pede gols ao motor de verdade (só nos testes; ver o arquivo)
require('../server/servidor.js');
