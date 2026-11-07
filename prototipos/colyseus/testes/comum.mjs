/* PROTÓTIPO COLYSEUS · o que os testes usam: o placar (OK/FALHOU), o "4G de mentira" (tests/v92_proxy.cjs), o bilhete e o
   selo DE VERDADE da plataforma (app/api/lib/selo.ts, carregado direto pelo Node 22) e as contas. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// (um erro no meio do teste não pode deixar o proxy órfão segurando a saída: mostra o erro, mata os filhos e sai com 1)
const filhos = new Set();
process.on('exit', () => { for (const f of filhos) try { f.kill(); } catch (_) {} });
const morre = (tipo) => (e) => { console.error('\n  ERRO (' + tipo + '): ' + (e && e.stack || e) + (e && e.code !== undefined ? '  · code ' + e.code : '')); process.exit(1); };
process.on('unhandledRejection', morre('promessa'));
process.on('uncaughtException', morre('exceção'));

export class Placar {
  constructor(nome) { this.nome = nome; this.ok = 0; this.total = 0; this.t0 = Date.now(); console.log('\n' + nome); }
  confere(cond, txt, det) {
    this.total++; if (cond) this.ok++;
    const d = det === undefined ? '' : '  ·  ' + (typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 600);
    console.log('  ' + (cond ? 'OK     ' : 'FALHOU ') + ' ' + txt + (cond ? '' : d));
    return !!cond;
  }
  info(txt) { console.log('         ' + txt); }
  fim() {
    console.log(this.nome + ': ' + this.ok + '/' + this.total + ' verificações ok em ' + ((Date.now() - this.t0) / 1000).toFixed(1) + ' s');
    return this.ok === this.total ? 0 : 1;
  }
}

export const canon = o => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((a, x) => (a[x] = v[x], a), {}) : v);
export const pct = (xs, p) => { if (!xs.length) return NaN; const s = xs.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };

export async function portaLivre() {
  return new Promise((ok, erro) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); s.on('error', erro); });
}

// o "4G de mentira" do RACHA (tests/v92_proxy.cjs): atraso em cada sentido, oscilação, "apaga MS" e "corta"
export async function proxy(destino, { atraso = 0, oscila = 0, semente = 7 } = {}) {
  const porta = await portaLivre();
  const p = spawn(process.execPath, [path.join(RAIZ, 'tests', 'v92_proxy.cjs'), '--porta', String(porta), '--destino', String(destino), '--atraso', String(atraso), '--oscila', String(oscila), '--semente', String(semente), '--controle'], { stdio: ['pipe', 'pipe', 'inherit'] });
  filhos.add(p); p.on('exit', () => filhos.delete(p));
  let saida = '';
  p.stdout.on('data', b => { saida += b.toString(); });
  const ate = Date.now() + 5000;
  while (!saida.includes('proxy ') && Date.now() < ate) await new Promise(ok => setTimeout(ok, 20));
  return {
    porta,
    async manda(cmd) { const antes = saida.length; p.stdin.write(cmd + '\n'); const fim = Date.now() + 2000; while (!saida.slice(antes).includes('ok ' + cmd) && Date.now() < fim) await new Promise(ok => setTimeout(ok, 10)); },
    fecha() { try { p.kill(); } catch (_) {} },
  };
}

// a plataforma de verdade: o mesmo arquivo que a plataforma usa para assinar o bilhete e conferir o selo
export async function plataforma(segredo) {
  process.env.RACHA_SEGREDO_SALAS = segredo;
  return import(path.join(RAIZ, 'app', 'api', 'lib', 'selo.ts'));
}
