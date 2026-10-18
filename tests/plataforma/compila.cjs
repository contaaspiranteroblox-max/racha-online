// RACHA · v88 — junta o código de verdade da plataforma (app/api) num arquivo só para a plataforma de teste
// (tests/saida/plataforma.mjs), com o esbuild. Troca só o que não existe aqui (o npm não instala nada nesta máquina):
//   drizzle-orm (+ /mysql-core, /mysql2) → tests/plataforma/drizzle_lite.mjs (SQLite do Node)
//   @trpc/server (+ /adapters/fetch)      → tests/plataforma/trpc_lite.mjs
//   superjson                             → tests/plataforma/superjson_lite.mjs
//   zod                                   → o zod 4 que vem no zod 3.25 do sistema (o mesmo jeito de escrever)
//   dotenv/config                         → nada (as variáveis vêm do processo)
// Uso: node tests/plataforma/compila.cjs   (o tests/plataforma/servidor.mjs chama sozinho quando precisa)
const path = require('path');
const fs = require('fs');
const RAIZ = path.resolve(__dirname, '..', '..');
const A = (p) => path.join(RAIZ, 'app', p);
let esbuild; for (const p of [A('node_modules/esbuild'), '/opt/npm-tools/node_modules/esbuild']) { try { esbuild = require(p); break; } catch (_) {} }
if (!esbuild) { console.error('sem o esbuild: rode npm install em app/'); process.exit(2); }
let zod = null;
for (const p of [A('node_modules/zod/index.js'), '/opt/npm-tools/node_modules/zod/v4/index.js']) if (fs.existsSync(p)) { zod = p; break; }
if (!zod) { console.error('sem o zod'); process.exit(2); }
const LITE = (n) => path.join(__dirname, n);
const SAIDA = path.join(RAIZ, 'tests', 'saida', 'plataforma.mjs');

async function compila() {
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'entrada.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    outfile: SAIDA,
    logLevel: 'warning',
    banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
    plugins: [{
      name: 'troca',
      setup(build) {
        const mapa = {
          'drizzle-orm': LITE('drizzle_lite.mjs'), 'drizzle-orm/mysql-core': LITE('drizzle_lite.mjs'), 'drizzle-orm/mysql2': LITE('drizzle_lite.mjs'),
          '@trpc/server': LITE('trpc_lite.mjs'), '@trpc/server/adapters/fetch': LITE('trpc_lite.mjs'),
          superjson: LITE('superjson_lite.mjs'), zod,
        };
        build.onResolve({ filter: /^(drizzle-orm(\/mysql-core|\/mysql2)?|@trpc\/server(\/adapters\/fetch)?|superjson|zod)$/ }, (a) => ({ path: mapa[a.path] }));
        build.onResolve({ filter: /^dotenv\/config$/ }, () => ({ path: 'vazio', namespace: 'vazio' }));
        build.onLoad({ filter: /.*/, namespace: 'vazio' }, () => ({ contents: '', loader: 'js' }));
      },
    }],
    alias: { '@contracts': A('contracts'), '@db': A('db'), '@': A('src') },
  });
  return SAIDA;
}
module.exports = { compila, SAIDA };
if (require.main === module) compila().then((s) => console.log('compilado:', path.relative(RAIZ, s))).catch((e) => { console.error(e.message || e); process.exit(1); });
