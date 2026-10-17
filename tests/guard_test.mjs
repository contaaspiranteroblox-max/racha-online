// RACHA v83 · a correção do guard.ts (o ajuste fino de permissões do RACHA CONTROL volta a valer).
// Roda com o Node 20+ (não precisa do Node 22 porque o guard.ts é compilado antes):
//   node tests/compila_guard.cjs  &&  node tests/guard_test.mjs
// (o compilado vai para tests/saida/ — pasta de rascunho, já ignorada no pacote)
// O banco é fingido (um dicionário), mas a função cargoDo é a DE VERDADE, importada do guard.ts compilado.

import { PERMISSOES_PADRAO } from './saida/racha.mjs';
import { cargoDo } from './saida/guard.mjs';

let ok = 0, falhou = 0;
function confere(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra) : '')); }
}

// ---- o banco fingido (só o que cargoDo usa) ----
const linhas = new Map(); // usuarioId -> {cargo, permissoes}
globalThis.__dbFingido = {
  query: { cargos: { findFirst: async ({where}) => {
    // o where é eq(cargos.usuarioId, id): a gente guarda o id pedido num truque — eq devolve um objeto com o valor
    const id = where?.valor ?? where?._valor ?? globalThis.__ultimoId;
    return linhas.get(id) ?? null;
  } } },
};

// o eq do drizzle fingido: carrega o valor pra consulta
globalThis.__eqFingido = (col, val) => ({ valor: val });

console.log('1) sem ajuste fino (permissoes = null): vale o padrão do cargo');
linhas.set(1, { cargo: 'moderador', permissoes: null });
linhas.set(2, { cargo: 'ajudante', permissoes: null });
let r = await cargoDo(1);
confere(r && r.cargo === 'moderador' && r.permissoes.join() === [...PERMISSOES_PADRAO.moderador].join(), 'o moderador sem ajuste tem o conjunto padrão', r);
r = await cargoDo(2);
confere(r && r.permissoes.length === PERMISSOES_PADRAO.ajudante.length, 'o ajudante sem ajuste tem o conjunto padrão', r);

console.log('\n2) o ajuste fino SUBSTITUI o conjunto (o que faltava antes da v83)');
const todas = PERMISSOES_PADRAO.moderador;
const tirada = todas[0];
const ajustado = todas.slice(1); // o Dono tirou a primeira permissão
linhas.set(3, { cargo: 'moderador', permissoes: ajustado });
r = await cargoDo(3);
confere(r && !r.permissoes.includes(tirada), 'a permissão tirada pelo Dono NÃO aparece mais', { tirada, tem: r?.permissoes });
confere(r && r.permissoes.length === todas.length - 1, 'o resto do conjunto continua igual', r?.permissoes?.length);

console.log('\n3) o ajuste não pode subir acima do teto do cargo');
linhas.set(4, { cargo: 'ajudante', permissoes: [...PERMISSOES_PADRAO.ajudante, ...PERMISSOES_PADRAO.dono] });
r = await cargoDo(4);
const acima = r.permissoes.filter(p => !PERMISSOES_PADRAO.ajudante.includes(p));
confere(acima.length === 0, 'permissão de dono injetada no ajuste é descartada', acima);

console.log('\n4) casos de borda');
linhas.set(5, { cargo: 'dono', permissoes: [] });
r = await cargoDo(5);
confere(r && r.permissoes.join() === [...PERMISSOES_PADRAO.dono].join(), 'o dono ignora qualquer ajuste (sempre o conjunto cheio)', r?.permissoes?.length);
linhas.set(6, { cargo: 'moderador', permissoes: [] });
r = await cargoDo(6);
confere(r && r.permissoes.length === 0, 'o ajuste vazio é respeitado: o moderador fica sem nenhuma permissão', r?.permissoes);
linhas.set(7, { cargo: 'moderador', permissoes: 'lixo' });
r = await cargoDo(7);
confere(r && r.permissoes.length === PERMISSOES_PADRAO.moderador.length, 'lixo no campo (não-lista) cai no padrão do cargo', r?.permissoes?.length);
r = await cargoDo(999);
confere(r === null, 'quem não tem cargo não tem permissão', r);

console.log('\nguard (correção v83): ' + ok + ' ok, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
