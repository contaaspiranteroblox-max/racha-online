// ============================================================================
// RACHA v109 — um QR code de verdade (ISO/IEC 18004) para o 2FA do painel: o app autenticador lê o otpauth:// com a câmera
// (ninguém precisa digitar 32 letras no celular). Modo byte, correção de erro M, versões 1 a 25 (até ~1.000 bytes; o endereço
// do 2FA tem ~110), as 8 máscaras com a pontuação do padrão. Sem dependências: gera a matriz (true = módulo escuro) e o
// componente desenha em SVG. Conferido pelo tests/v109_painel_test.py lendo o QR desenhado com o leitor do OpenCV.
// ============================================================================

// correção M: as palavras de correção por bloco e o número de blocos, por versão (1..25)
const ECC_POR_BLOCO = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28];
const BLOCOS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21];
const VERSAO_MAX = 25;

// os módulos de dados de uma versão (o total menos os padrões fixos)
function modulosDeDados(v: number): number {
  let n = (16 * v + 128) * v + 64;
  if (v >= 2) {
    const a = Math.floor(v / 7) + 2;
    n -= (25 * a - 10) * a - 55;
    if (v >= 7) n -= 36;
  }
  return n;
}
const palavrasDeDados = (v: number) => Math.floor(modulosDeDados(v) / 8) - ECC_POR_BLOCO[v] * BLOCOS[v];

// ---- Reed-Solomon em GF(256), polinômio 0x11D
function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function divisor(grau: number): number[] {
  const r = new Array<number>(grau).fill(0);
  r[grau - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grau; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMul(r[j], raiz);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    raiz = gfMul(raiz, 0x02);
  }
  return r;
}
function resto(dados: number[], div: number[]): number[] {
  const r = new Array<number>(div.length).fill(0);
  for (const b of dados) {
    const f = b ^ (r.shift() as number);
    r.push(0);
    for (let i = 0; i < div.length; i++) r[i] ^= gfMul(div[i], f);
  }
  return r;
}

// ---- os bits dos dados (modo byte)
function bitsDosDados(bytes: number[], v: number): number[] {
  const bits: number[] = [];
  const poe = (val: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  poe(0b0100, 4);
  poe(bytes.length, v <= 9 ? 8 : 16);
  for (const b of bytes) poe(b, 8);
  const cap = palavrasDeDados(v) * 8;
  poe(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) poe(pad, 8);
  return bits;
}

// ---- as palavras finais: os blocos com a correção, intercalados
function palavrasFinais(dados: number[], v: number): number[] {
  const nBlocos = BLOCOS[v], eccLen = ECC_POR_BLOCO[v];
  const total = Math.floor(modulosDeDados(v) / 8);
  const curtos = nBlocos - (total % nBlocos);
  const tamCurto = Math.floor(total / nBlocos);
  const div = divisor(eccLen);
  const blocos: number[][] = [];
  for (let i = 0, k = 0; i < nBlocos; i++) {
    const n = tamCurto - eccLen + (i < curtos ? 0 : 1);
    const d = dados.slice(k, k + n);
    k += n;
    const e = resto(d, div);
    if (i < curtos) d.push(0); // (o lugar vazio do bloco curto, pulado na intercalação)
    blocos.push(d.concat(e));
  }
  const out: number[] = [];
  for (let i = 0; i < blocos[0].length; i++) {
    for (let j = 0; j < blocos.length; j++) {
      if (i !== tamCurto - eccLen || j >= curtos) out.push(blocos[j][i]);
    }
  }
  return out;
}

function posicoesAlinhamento(v: number, tam: number): number[] {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2;
  const passo = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
  const r = [6];
  for (let p = tam - 7; r.length < n; p -= passo) r.splice(1, 0, p);
  return r;
}

function bitsFormato(mascara: number): number {
  const dados = (0 << 3) | mascara; // (M = 00)
  let r = dados;
  for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
  return ((dados << 10) | r) ^ 0x5412;
}
function bitsVersao(v: number): number {
  let r = v;
  for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
  return (v << 12) | r;
}

const MASCARAS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function penalidade(m: boolean[][]): number {
  const n = m.length;
  let p = 0;
  const linha = (get: (i: number, j: number) => boolean) => {
    for (let i = 0; i < n; i++) {
      let corrida = 1;
      for (let j = 1; j < n; j++) {
        if (get(i, j) === get(i, j - 1)) {
          corrida++;
          if (corrida === 5) p += 3;
          else if (corrida > 5) p++;
        } else corrida = 1;
      }
      // o padrão parecido com o do canto (1:1:3:1:1 com 4 claros de um lado)
      for (let j = 0; j + 10 < n; j++) {
        const a = [true, false, true, true, true, false, true, false, false, false, false];
        const b = [false, false, false, false, true, false, true, true, true, false, true];
        let ea = true, eb = true;
        for (let k = 0; k < 11; k++) {
          const v = get(i, j + k);
          if (v !== a[k]) ea = false;
          if (v !== b[k]) eb = false;
        }
        if (ea) p += 40;
        if (eb) p += 40;
      }
    }
  };
  linha((i, j) => m[i][j]);
  linha((i, j) => m[j][i]);
  for (let y = 0; y + 1 < n; y++) {
    for (let x = 0; x + 1 < n; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
  }
  let escuros = 0;
  for (const l of m) for (const c of l) if (c) escuros++;
  const total = n * n;
  p += Math.floor(Math.abs(escuros * 20 - total * 10) / total) * 10;
  return p;
}

// a matriz do QR code (true = escuro), sem a margem; null se o texto não couber
export function qrMatriz(texto: string, mascaraFixa?: number): boolean[][] | null {
  const bytes = Array.from(new TextEncoder().encode(texto));
  let v = 1;
  for (; v <= VERSAO_MAX; v++) {
    const cabeca = 4 + (v <= 9 ? 8 : 16);
    if (cabeca + bytes.length * 8 <= palavrasDeDados(v) * 8) break;
  }
  if (v > VERSAO_MAX) return null;
  const tam = v * 4 + 17;
  const bits = bitsDosDados(bytes, v);
  const dados: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
    dados.push(b);
  }
  const palavras = palavrasFinais(dados, v);

  const mod: boolean[][] = Array.from({ length: tam }, () => new Array<boolean>(tam).fill(false));
  const fixo: boolean[][] = Array.from({ length: tam }, () => new Array<boolean>(tam).fill(false));
  const poe = (x: number, y: number, escuro: boolean) => { mod[y][x] = escuro; fixo[y][x] = true; };

  // a linha do tempo
  for (let i = 0; i < tam; i++) { poe(6, i, i % 2 === 0); poe(i, 6, i % 2 === 0); }
  // os três cantos (com a borda clara)
  const canto = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= tam || y >= tam) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        poe(x, y, d !== 2 && d !== 4);
      }
    }
  };
  canto(3, 3); canto(tam - 4, 3); canto(3, tam - 4);
  // os de alinhamento
  const al = posicoesAlinhamento(v, tam);
  for (let i = 0; i < al.length; i++) {
    for (let j = 0; j < al.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) poe(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  // o formato (reservado agora, escrito com a máscara escolhida) e a versão
  const formato = (mascara: number) => {
    const b = bitsFormato(mascara);
    const bit = (i: number) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) poe(8, i, bit(i));
    poe(8, 7, bit(6)); poe(8, 8, bit(7)); poe(7, 8, bit(8));
    for (let i = 9; i < 15; i++) poe(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) poe(tam - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) poe(8, tam - 15 + i, bit(i));
    poe(8, tam - 8, true); // (o módulo escuro de sempre)
  };
  formato(0);
  if (v >= 7) {
    const b = bitsVersao(v);
    for (let i = 0; i < 18; i++) {
      const escuro = ((b >>> i) & 1) === 1;
      const a = tam - 11 + (i % 3), c = Math.floor(i / 3);
      poe(a, c, escuro); poe(c, a, escuro);
    }
  }
  // os dados, em zigue-zague de baixo para cima, duas colunas por vez (pulando a coluna 6)
  let i = 0;
  const totalBits = palavras.length * 8;
  for (let dir = tam - 1; dir >= 1; dir -= 2) {
    if (dir === 6) dir = 5;
    for (let vert = 0; vert < tam; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = dir - j;
        const sobe = ((dir + 1) & 2) === 0;
        const y = sobe ? tam - 1 - vert : vert;
        if (!fixo[y][x] && i < totalBits) {
          mod[y][x] = ((palavras[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          i++;
        }
      }
    }
  }
  // a máscara com a menor penalidade
  let melhor = 0, menor = Infinity;
  const aplica = (k: number) => {
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) if (!fixo[y][x] && MASCARAS[k](x, y)) mod[y][x] = !mod[y][x];
  };
  for (let k = 0; k < 8; k++) {
    if (mascaraFixa !== undefined && k !== mascaraFixa) continue; // (os testes conferem cada máscara)
    aplica(k); formato(k);
    const p = penalidade(mod);
    if (p < menor) { menor = p; melhor = k; }
    aplica(k); // (desfaz)
  }
  aplica(melhor); formato(melhor);
  return mod;
}

// o caminho SVG dos módulos escuros (um quadrado por módulo), com `margem` módulos claros em volta
export function qrCaminho(m: boolean[][], margem = 4): { caminho: string; lado: number } {
  let d = "";
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m.length; x++) if (m[y][x]) d += `M${x + margem} ${y + margem}h1v1h-1z`;
  }
  return { caminho: d, lado: m.length + margem * 2 };
}
