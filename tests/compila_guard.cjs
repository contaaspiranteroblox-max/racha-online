// Compila o guard.ts de verdade pra ESM, trocando o banco e o schema por dublês
// (o teste exercita a lógica real de cargoDo sem precisar de MySQL).
const path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const A = (p) => path.join(RAIZ, 'app', p);
let esbuild; for (const p of [A('node_modules/esbuild'), '/opt/npm-tools/node_modules/esbuild']) { try { esbuild = require(p); break; } catch (_) {} }   // (arnês: sem o npm install, o do sistema)
if (!esbuild) { console.log('sem o esbuild: rode npm install em app/'); process.exit(2); }

const stubDb = `
export function getDb(){
  return globalThis.__dbFingido;
}
`;
const stubSchema = `
export const cargos = { usuarioId: 'col_usuarioId' };
export const sessoes = { tokenHash: '', revogadaEm: '', expiraEm: '' };
export const usuarios = { id: '' };
export const auditoria = {};
export const limites = { chave: '' };
`;
const stubMiddleware = `
export const publicQuery = { use: (fn) => ({ use: (fn2) => fn2, fn }) };
`;
const stubDrizzle = `
export const eq = (col, val) => ({ valor: val });
export const and = (...a) => a;
export const gt = (a, b) => ({ gt: [a, b] });
export const isNull = (a) => ({ isNull: a });
`;

async function main(){
  await esbuild.build({
    entryPoints: [A('api/racha/guard.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: path.join(__dirname, 'saida', 'guard.mjs'),
    logLevel: 'warning',
    plugins: [{
      name: 'dubles',
      setup(build){
        build.onResolve({ filter: /queries\/connection$/ }, () => ({ path: 'stub-db', namespace: 'stub' }));
        build.onResolve({ filter: /^@db\/schema$/ }, () => ({ path: 'stub-schema', namespace: 'stub' }));
        build.onResolve({ filter: /middleware$/ }, () => ({ path: 'stub-middleware', namespace: 'stub' }));
        build.onResolve({ filter: /^drizzle-orm$/ }, () => ({ path: 'stub-drizzle', namespace: 'stub' }));
        build.onResolve({ filter: /^@trpc\/server$/ }, () => ({ path: 'stub-trpc', namespace: 'stub' }));   // (arnês: sem o npm install)
        build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => {
          const map = { 'stub-db': stubDb, 'stub-schema': stubSchema, 'stub-middleware': stubMiddleware, 'stub-drizzle': stubDrizzle, 'stub-trpc': 'export class TRPCError extends Error { constructor(o){ super((o && o.message) || (o && o.code) || \'TRPCError\'); this.code = o && o.code; } }' };
          return { contents: map[args.path], loader: 'js' };
        });
      },
    }],
    alias: {
      '@contracts': A('contracts'),
      '@db': A('db'),
      '@': A('src'),
    },
  });
  // os contratos de verdade (patentes/progresso/racha) pra suíte
  await esbuild.build({
    entryPoints: [A('contracts/racha.ts')],
    bundle: true, format: 'esm', platform: 'node',
    outfile: path.join(__dirname, 'saida', 'racha.mjs'), logLevel: 'warning',
    alias: { '@contracts': '' + RAIZ + '/contracts' },
  });
  console.log('compilado');
}
main().catch((e) => { console.error(e); process.exit(1); });
