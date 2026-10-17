// RACHA v82 · as regras da conta (sem banco): a patente da ranqueada (app/contracts/patentes.ts) e a cópia do progresso
// (app/contracts/progresso.ts). Roda com o Node 22.18+ (lê o TypeScript direto, sem compilar):  node tests/contas_test.mjs
// A comparação com o jogo (o rqPontua de verdade, no navegador) fica no tests/v82_test.py.
import { patenteDe, pontuaRanqueada, patenteImportada, normalizaEstado, PATENTES, RQ_LIMITES, ESTADO_RQ_INICIAL } from '../app/contracts/patentes.ts';
import { validaProgresso, PROGRESSO_CHAVES, PROGRESSO_MAX_BYTES } from '../app/contracts/progresso.ts';

let ok = 0, falhou = 0;
function confere(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; console.log('  FALHOU  ' + txt + (extra !== undefined ? '  ·  ' + JSON.stringify(extra) : '')); }
}
const E = o => Object.assign({}, ESTADO_RQ_INICIAL, o);

console.log('1) as patentes e as divisões (as faixas da imagem)');
const cortes = {0:'BRONZE III', 129:'BRONZE III', 130:'BRONZE II', 270:'BRONZE I', 399:'BRONZE I', 400:'PRATA III', 530:'PRATA II', 670:'PRATA I', 800:'OURO III', 970:'OURO II',
  1130:'OURO I', 1300:'PLATINA III', 1500:'PLATINA II', 1700:'PLATINA I', 1900:'DIAMANTE III', 2130:'DIAMANTE II', 2370:'DIAMANTE I', 2600:'ÉLITE III', 2870:'ÉLITE II',
  3130:'ÉLITE I', 3400:'MESTRE III', 3700:'MESTRE II', 4000:'MESTRE I', 4300:'LENDÁRIO III', 4600:'LENDÁRIO II', 4900:'LENDÁRIO I', 99999:'LENDÁRIO I'};
const errados = Object.entries(cortes).filter(([p, t]) => patenteDe(Number(p)).titulo !== t).map(([p, t]) => [p, t, patenteDe(Number(p)).titulo]);
confere(!errados.length, 'os cortes de cada divisão (Bronze III em 0 … Lendário I em 4.900)', errados);
const ordens = [0, 130, 270, 400, 530, 670, 800, 970, 1130, 1300, 1500, 1700, 1900, 2130, 2370, 2600, 2870, 3130, 3400, 3700, 4000, 4300, 4600, 4900].map(p => patenteDe(p).ordem);
confere(ordens.join() === Array.from({length:24}, (_, i) => i + 1).join(), 'a ordem vai de 1 (Bronze III) a 24 (Lendário I)', ordens);
confere(patenteDe(-50).titulo === 'BRONZE III' && patenteDe(NaN).titulo === 'BRONZE III' && patenteDe(4899.9).titulo === 'LENDÁRIO II', 'pontos negativos ou quebrados não quebram a conta');
confere(PATENTES.length === 8 && patenteDe(4900).prox === null && patenteDe(1000).prox === 1130 && patenteDe(1000).minPatente === 800, 'o topo não tem próxima; a proteção é o começo da patente');

console.log('\n2) a conta de cada partida (as regras do jogo)');
let r = pontuaRanqueada(E({pts:500}), {placarNosso:3, placarDeles:0, abandono:false, contraBots:true, nivelBots:'facil'});
confere(r.delta === 22 + 9 && r.estado.vit === 1 && r.estado.seq === 1 && r.estado.jogos === 1 && r.motivo === 'vitoria', 'vitória por 3 de diferença: +31', r);
r = pontuaRanqueada(E({pts:500}), {placarNosso:3, placarDeles:1, abandono:false, contraBots:true, nivelBots:'dificil'});
confere(r.delta === 22 + 6 + 6, 'contra os bots mais fortes: +6', r.delta);
r = pontuaRanqueada(E({pts:500}), {placarNosso:3, placarDeles:1, abandono:false, contraBots:false, nivelBots:'dificil'});
confere(r.delta === 28, 'online não tem o bônus dos bots', r.delta);
r = pontuaRanqueada(E({pts:500, seq:2}), {placarNosso:1, placarDeles:0, abandono:false, contraBots:false});
confere(r.delta === 22 + 3 + 4 && r.estado.seq === 3, 'a 3ª vitória seguida: +4', r);
r = pontuaRanqueada(E({pts:700}), {placarNosso:0, placarDeles:3, abandono:false, contraBots:true});
confere(r.delta === -20 && r.estado.seq === 0 && r.estado.der === 1, 'derrota por 3: −20 (e a sequência zera)', r);
r = pontuaRanqueada(E({pts:200}), {placarNosso:0, placarDeles:3, abandono:false, contraBots:true});
confere(r.delta === -10, 'no Bronze, a derrota tira a metade', r.delta);
r = pontuaRanqueada(E({pts:200}), {placarNosso:1, placarDeles:2, abandono:false, contraBots:true});
confere(r.delta === Math.round(-16/2), 'no Bronze, a metade arredonda como o jogo (−8)', r.delta);
r = pontuaRanqueada(E({pts:805}), {placarNosso:0, placarDeles:3, abandono:false, contraBots:false});
confere(r.depois === 800 && r.delta === -5 && !r.caiu, 'a derrota não tira da patente (Ouro III fica em 800)', r);
r = pontuaRanqueada(E({pts:980}), {placarNosso:0, placarDeles:3, abandono:false, contraBots:false});
confere(r.depois === 960 && r.caiu, 'mas tira da divisão (Ouro II → Ouro III)', r);
r = pontuaRanqueada(E({pts:5, seq:4}), {placarNosso:0, placarDeles:1, abandono:true, contraBots:true});
confere(r.depois === 0 && r.motivo === 'desistencia' && r.estado.seq === 0 && r.estado.desist === 1 && r.estado.jogos === 1, 'desistência: −25, sem ficar negativo', r);
r = pontuaRanqueada(E({pts:900}), {placarNosso:2, placarDeles:2, abandono:true, contraBots:false});
confere(r.delta === -25 && r.depois === 875, 'desistir empatando também é desistência', r);
r = pontuaRanqueada(E({pts:1000, seq:2}), {placarNosso:1, placarDeles:1, abandono:false, contraBots:true});
confere(r.delta === 0 && r.estado.emp === 1 && r.estado.seq === 0 && r.estado.jogos === 1 && r.motivo === 'empate', 'empate: 0 ponto, a sequência zera (v80)', r);
r = pontuaRanqueada(E({pts:390}), {placarNosso:3, placarDeles:0, abandono:false, contraBots:false});
confere(r.subiu && r.estado.melhor === 421 && patenteDe(r.depois).titulo === 'PRATA III', 'subir de patente (Bronze I → Prata III) e o melhor', r);

console.log('\n3) o teto do dia contra os bots (a conta)');
r = pontuaRanqueada(E({pts:1000}), {placarNosso:3, placarDeles:0, abandono:false, contraBots:true}, RQ_LIMITES.botsPorDia - 10);
confere(r.delta === 10 && r.limitado && r.ganhoBots === RQ_LIMITES.botsPorDia, 'perto do teto: só o que falta (+10)', r);
r = pontuaRanqueada(E({pts:1000}), {placarNosso:3, placarDeles:0, abandono:false, contraBots:true}, RQ_LIMITES.botsPorDia);
confere(r.delta === 0 && r.limitado && r.estado.vit === 1 && r.estado.seq === 1, 'no teto: a vitória conta, os pontos não', r);
r = pontuaRanqueada(E({pts:1000}), {placarNosso:3, placarDeles:0, abandono:false, contraBots:false}, 99999);
confere(r.delta === 31 && !r.limitado, 'online não tem teto', r);
r = pontuaRanqueada(E({pts:1000}), {placarNosso:0, placarDeles:3, abandono:false, contraBots:true}, 99999);
confere(r.delta === -20, 'a derrota contra os bots tira do mesmo jeito (o teto é só do ganho)', r.delta);

console.log('\n4) a patente do aparelho entrando na conta (uma vez, com teto)');
confere(patenteImportada(E({}), 3500).pts === RQ_LIMITES.importarAte, 'Mestre no aparelho entra como ' + RQ_LIMITES.importarAte + ' (Prata I)');
confere(patenteImportada(E({}), 300).pts === 300, 'abaixo do teto entra como está');
confere(patenteImportada(E({jogos:3, pts:120}), 900) === null && patenteImportada(E({}), 0) === null, 'conta que já jogou (ou nada a trazer): não entra');
confere(normalizaEstado({pts:'12', melhor:3, seq:-2}).melhor === 12 && normalizaEstado(null).pts === 0, 'o estado guardado é conferido (texto, negativo, vazio)');

console.log('\n5) a cópia do progresso (o save na nuvem)');
let v = validaProgresso({v:1, chaves:{'streetball-conta-v1':'{"moedas":10}', 'racha-v80-padrao':'1'}});
confere(v.ok && v.bytes > 0, 'a cópia certa passa', v);
v = validaProgresso({v:1, chaves:{'streetball-server':'ws://x'}});
confere(!v.ok && /fora do progresso/.test(v.erro), 'chave que não é progresso (o servidor, os tokens) é recusada', v);
v = validaProgresso({v:1, chaves:{'streetball-conta-v1':{moedas:1}}});
confere(!v.ok, 'valor que não é texto é recusado', v);
v = validaProgresso({v:2, chaves:{}});
confere(!v.ok, 'versão desconhecida é recusada', v);
v = validaProgresso({v:1, chaves:{'streetball-conta-v1':'x'.repeat(170*1024)}});
confere(!v.ok, 'uma chave grande demais é recusada', v.erro);
const muitas = {}; for (const k of PROGRESSO_CHAVES.slice(0, 2)) muitas[k] = 'y'.repeat(150*1024);
v = validaProgresso({v:1, chaves:muitas});
confere(!v.ok && /tamanho/.test(v.erro), 'a cópia inteira tem teto (' + PROGRESSO_MAX_BYTES/1024 + ' KB)', v.erro);
confere(!validaProgresso(null).ok && !validaProgresso([]).ok && !validaProgresso({v:1, chaves:[]}).ok, 'lixo é recusado');
confere(!PROGRESSO_CHAVES.some(k => /server|token|replays|som|hud|teclas|ui-v1|sala-pref|brasil/.test(k)), 'as configurações do aparelho, os tokens e os replays não vão para a conta');

console.log('\ncontas (regras): ' + ok + ' ok, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
