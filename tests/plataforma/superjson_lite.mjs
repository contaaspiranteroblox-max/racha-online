// RACHA · v88 — o pedaço do superjson que a plataforma usa (datas), SÓ PARA OS TESTES.
// serialize(x) → {json, meta?}: Date vira texto ISO e o meta diz onde ("values": {"a.b": ["Date"]}); deserialize volta.
function anda(x, caminho, meta) {
  if (x instanceof Date) { meta[caminho.join('.')] = ['Date']; return x.toISOString(); }
  if (typeof x === 'bigint') { meta[caminho.join('.')] = ['bigint']; return x.toString(); }
  if (x === undefined) { if (caminho.length) meta[caminho.join('.')] = ['undefined']; return null; }
  if (Array.isArray(x)) return x.map((v, i) => anda(v, caminho.concat(String(i)), meta));
  if (x && typeof x === 'object') {
    if (x instanceof Map) { meta[caminho.join('.')] = ['map']; return [...x.entries()].map(([k, v], i) => [k, anda(v, caminho.concat(String(i), '1'), meta)]); }
    if (x instanceof Set) { meta[caminho.join('.')] = ['set']; return [...x.values()]; }
    const o = {};
    for (const [k, v] of Object.entries(x)) { if (v === undefined) continue; o[k] = anda(v, caminho.concat(k), meta); }
    return o;
  }
  return x;
}
export function serialize(x) {
  const meta = {};
  const json = anda(x, [], meta);
  return Object.keys(meta).length ? { json, meta: { values: meta } } : { json };
}
export function deserialize(p) {
  if (!p || typeof p !== 'object') return p;
  let json = p.json;
  const valores = p.meta && p.meta.values;
  if (valores) {
    for (const [cam, tipos] of Object.entries(valores)) {
      const partes = cam ? cam.split('.') : [];
      const tipo = Array.isArray(tipos) ? tipos[0] : tipos;
      const conv = (v) => (tipo === 'Date' ? new Date(v) : tipo === 'bigint' ? BigInt(v) : tipo === 'undefined' ? undefined : tipo === 'set' ? new Set(v) : tipo === 'map' ? new Map(v) : v);
      if (!partes.length) { json = conv(json); continue; }
      let o = json;
      for (let i = 0; i < partes.length - 1 && o; i++) o = o[partes[i]];
      if (o && partes[partes.length - 1] in o) o[partes[partes.length - 1]] = conv(o[partes[partes.length - 1]]);
    }
  }
  return json;
}
export const stringify = (x) => JSON.stringify(serialize(x));
export const parse = (s) => deserialize(JSON.parse(s));
export default { serialize, deserialize, stringify, parse };
