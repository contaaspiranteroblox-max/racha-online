// RACHA · v88.1 — junta as páginas de verdade do site (app/src) com o cliente e o roteador de teste numa página só
// (tests/build/ui_site.html + ui_site.js), com o esbuild e o React que já estão nesta máquina (/opt/npm-tools).
//   node tests/ui_site/compila_ui.cjs
const path = require('path');
const fs = require('fs');
const RAIZ = path.resolve(__dirname, '..', '..');
const A = (p) => path.join(RAIZ, 'app', p);
const NM = ['/opt/npm-tools/node_modules', A('node_modules')].find((p) => fs.existsSync(path.join(p, 'react')) && fs.existsSync(path.join(p, 'react-dom')));
let esbuild; for (const p of [A('node_modules/esbuild'), '/opt/npm-tools/node_modules/esbuild']) { try { esbuild = require(p); break; } catch (_) {} }
if (!esbuild || !NM) { console.error('sem o esbuild ou sem o React (react, react-dom)'); process.exit(2); }
const SAIDA = path.join(RAIZ, 'tests', 'build');
async function compila() {
  fs.mkdirSync(SAIDA, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'entrada.tsx')], bundle: true, format: 'esm', platform: 'browser', target: 'es2020',
    outfile: path.join(SAIDA, 'ui_site.js'), jsx: 'automatic', logLevel: 'warning', define: { 'process.env.NODE_ENV': '"development"' },
    nodePaths: [NM],
    alias: { '@/providers/trpc': path.join(__dirname, 'trpc_teste.tsx'), 'react-router': path.join(__dirname, 'router_teste.tsx'), '@contracts': A('contracts'), '@db': A('db'), '@': A('src') },
    loader: { '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty', '.css': 'empty' },
  });
  fs.writeFileSync(path.join(SAIDA, 'ui_site.html'), '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RACHA · site (teste)</title></head><body><div id="raiz"></div><script type="module" src="./ui_site.js"></script></body></html>\n');
  return SAIDA;
}
module.exports = { compila };
if (require.main === module) compila().then(() => console.log('compilado: tests/build/ui_site.html')).catch((e) => { console.error(e.message || e); process.exit(1); });
