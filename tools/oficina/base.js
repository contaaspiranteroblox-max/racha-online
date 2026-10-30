/* =====================================================================================================================
   RACHA v92 · OFICINA DE CRIAÇÃO 2.0 — A BASE (tools/oficina/base.js)
   (o build cola este arquivo e os outros da Oficina dentro de uma função só: nada daqui vira variável global do jogo,
   a não ser window.OFI; os ganchos no jogo são poucos e conferidos: o laço do quadro, as mensagens da rede, a barra
   do chat e o botão OFICINA na tela inicial)
     · o espaço OFI, os desenhos dos ícones e os ajudantes de tela (sem innerHTML com texto de ninguém);
     · a GAVETA: os mapas do aparelho (rascunhos, versões e a recuperação) no IndexedDB (ou, sem ele, no localStorage);
     · a CONVERSA com o servidor das salas (mapa_req → mapa_res), pela mesma conexão do jogo (NET49);
     · os ganchos: o jogo dorme enquanto a Oficina está aberta e a partida da Oficina desenha no lugar dele.
   ===================================================================================================================== */
const RM = window.RachaMapa, RN = window.RachaNucleo;
if (!RM || !RN) throw new Error('A Oficina precisa do RachaMapa e do RachaNucleo');
const OFI = window.OFI = { aberta: false, tela: '', raiz: null, versao: 'oficina-2.0', eu: null, conectando: null };
const U = RN.U, TAU = Math.PI * 2, RAD = Math.PI / 180;
const NOME_TIME = i => ['TIME A', 'TIME B', 'TIME C', 'TIME D'][i] || 'TIME ' + (i + 1);

/* ---------------------------------------------------------------- os ícones (desenhos fixos, 24 × 24) */
const IC = {
  voltar: '<path d="M14.6 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
  desfazer: '<path d="M9 7H5V3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 7.5A8 8 0 1 1 6 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  refazer: '<path d="M15 7h4V3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 7.5A8 8 0 1 0 18 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  salvar: '<path d="M4 4h12l4 4v12H4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M8 4v5h7V4M7 20v-6h10v6" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
  mais: '<circle cx="12" cy="5" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="19" r="2.2" fill="currentColor"/>',
  cursor: '<path d="M5 3l14 8.5-6.2 1.4 3.6 6.6-2.6 1.4-3.6-6.6L5.5 18z" fill="currentColor"/>',
  mao: '<path d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-1V5.5a1.5 1.5 0 0 1 3 0V12m0-2.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.6-2.2L4 15.4a1.6 1.6 0 0 1 2.4-2.1L7 14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  linha: '<path d="M4 18L10 8l5 7 5-9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="18" r="2" fill="currentColor"/><circle cx="10" cy="8" r="2" fill="currentColor"/><circle cx="15" cy="15" r="2" fill="currentColor"/><circle cx="20" cy="6" r="2" fill="currentColor"/>',
  poligono: '<path d="M12 3l8 6-3 11H7L4 9z" fill="currentColor" opacity=".35"/><path d="M12 3l8 6-3 11H7L4 9z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  parede: '<rect x="3" y="10" width="18" height="4.5" rx="1.5" fill="currentColor"/>',
  arco: '<path d="M4 18a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
  retangulo: '<rect x="4" y="6" width="16" height="12" rx="1.5" fill="currentColor"/>',
  circulo: '<circle cx="12" cy="12" r="8" fill="currentColor"/>',
  triangulo: '<path d="M12 4l9 16H3z" fill="currentColor"/>',
  adicionar: '<path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
  grade: '<path d="M4 4h16v16H4zM9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  ima: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M6 8h4M14 8h4" stroke="currentColor" stroke-width="2.2"/>',
  zoomMais: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L20 20M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  zoomMenos: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L20 20M7.5 10.5h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  ajustar: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  camadas: '<path d="M12 3l9 5-9 5-9-5z" fill="currentColor"/><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  duplicar: '<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5 15H4V4h11v1" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  lixo: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2"/>',
  copiar: '<rect x="8" y="3" width="12" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5 7v13h11" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  colar: '<path d="M9 4h6v3H9z" fill="currentColor"/><path d="M8 5H5v16h14V5h-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  girar: '<path d="M20 12a8 8 0 1 1-2.3-5.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 3.5v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  espelhaH: '<path d="M12 3v18" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 2"/><path d="M9 6L3 18h6zM15 6l6 12h-6z" fill="currentColor"/>',
  espelhaV: '<path d="M3 12h18" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 2"/><path d="M6 9L18 3v6zM6 15l12 6v-6z" fill="currentColor"/>',
  cadeado: '<rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/>',
  aberto: '<rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 7.7-1.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  olho: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  olhoNao: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  agrupar: '<rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor"/><rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor"/><path d="M2 2h20v20H2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2"/>',
  desagrupar: '<rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor"/><rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor"/>',
  alinhaE: '<path d="M4 3v18" stroke="currentColor" stroke-width="2.4"/><rect x="7" y="6" width="12" height="4" rx="1" fill="currentColor"/><rect x="7" y="14" width="7" height="4" rx="1" fill="currentColor"/>',
  alinhaC: '<path d="M12 3v18" stroke="currentColor" stroke-width="2"/><rect x="5" y="6" width="14" height="4" rx="1" fill="currentColor"/><rect x="8" y="14" width="8" height="4" rx="1" fill="currentColor"/>',
  alinhaD: '<path d="M20 3v18" stroke="currentColor" stroke-width="2.4"/><rect x="5" y="6" width="12" height="4" rx="1" fill="currentColor"/><rect x="10" y="14" width="7" height="4" rx="1" fill="currentColor"/>',
  alinhaT: '<path d="M3 4h18" stroke="currentColor" stroke-width="2.4"/><rect x="6" y="7" width="4" height="12" rx="1" fill="currentColor"/><rect x="14" y="7" width="4" height="7" rx="1" fill="currentColor"/>',
  alinhaM: '<path d="M3 12h18" stroke="currentColor" stroke-width="2"/><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="8" width="4" height="8" rx="1" fill="currentColor"/>',
  alinhaB: '<path d="M3 20h18" stroke="currentColor" stroke-width="2.4"/><rect x="6" y="5" width="4" height="12" rx="1" fill="currentColor"/><rect x="14" y="10" width="4" height="7" rx="1" fill="currentColor"/>',
  distH: '<rect x="3" y="7" width="4" height="10" rx="1" fill="currentColor"/><rect x="10" y="7" width="4" height="10" rx="1" fill="currentColor"/><rect x="17" y="7" width="4" height="10" rx="1" fill="currentColor"/>',
  distV: '<rect x="7" y="3" width="10" height="4" rx="1" fill="currentColor"/><rect x="7" y="10" width="10" height="4" rx="1" fill="currentColor"/><rect x="7" y="17" width="10" height="4" rx="1" fill="currentColor"/>',
  frente: '<rect x="3" y="3" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10" y="10" width="11" height="11" rx="1.5" fill="currentColor"/>',
  tras: '<rect x="10" y="10" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="3" width="11" height="11" rx="1.5" fill="currentColor"/>',
  campo: '<rect x="2.5" y="5" width="19" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 5v14" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 9h3v6h-3M21.5 9h-3v6h3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  pincel: '<path d="M19.5 3.5c-3 1.6-7.6 6.3-9 8.6l1.4 1.4c2.3-1.4 7-6 8.6-9z" fill="currentColor"/><path d="M9.6 13.2c-2.4 0-3.6 1.6-3.8 3.4-.2 1.6-1 2.6-2.3 2.9 3.6 1.8 8.6.9 8.6-3.8z" fill="currentColor"/>',
  fisica: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7.5l3.4 2.5-1.3 4H9.9l-1.3-4z" fill="currentColor"/><path d="M12 3.5v4M15.4 10l3.7-1.2M14.1 14l2.4 3.2M9.9 14l-2.4 3.2M8.6 10L4.9 8.8" stroke="currentColor" stroke-width="1.6"/>',
  apito: '<path d="M3 11a5 5 0 0 1 5-5h12v4h-4l-1.2 2A6 6 0 1 1 3 11z" fill="currentColor"/><circle cx="9" cy="12" r="2" fill="#0e1438"/>',
  raio: '<path d="M13 2L4 14h7l-2 8 9-12h-7z" fill="currentColor"/>',
  pino: '<path d="M12 22s7-7.4 7-12.5A7 7 0 0 0 5 9.5C5 14.6 12 22 12 22z" fill="currentColor"/><circle cx="12" cy="9.5" r="2.6" fill="#0e1438"/>',
  check: '<path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  alerta: '<path d="M12 3l10 18H2z" fill="currentColor"/><path d="M12 9v5" stroke="#0e1438" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.5" fill="#0e1438"/>',
  estrela: '<path d="M12 2.8l2.8 6 6.5.7-4.8 4.4 1.3 6.4L12 17l-5.8 3.3 1.3-6.4L2.7 9.5l6.5-.7z" fill="currentColor"/>',
  coracao: '<path d="M12 20.5S3 14.7 3 8.8A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 9 2.4c0 5.9-9 11.7-9 11.7z" fill="currentColor"/>',
  nuvem: '<path d="M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z" fill="currentColor"/><path d="M12 16V10m-3 3l3-3 3 3" fill="none" stroke="#0e1438" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  baixar: '<path d="M12 3v12m-5-5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 19h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  subir: '<path d="M12 16V4m-5 5l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 20h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  compartilhar: '<circle cx="18" cy="5.5" r="2.8" fill="currentColor"/><circle cx="6" cy="12" r="2.8" fill="currentColor"/><circle cx="18" cy="18.5" r="2.8" fill="currentColor"/><path d="M8.5 10.8l7-4M8.5 13.2l7 4" stroke="currentColor" stroke-width="2"/>',
  lupa: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M15.5 15.5L20.5 20.5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>',
  bandeira: '<path d="M6 21V4m0 1h11l-2.5 3.5L17 12H6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  lapis: '<path d="M4 20l1-4.5L15.5 5l3.5 3.5L8.5 19z" fill="currentColor"/><path d="M14 6.5l3.5 3.5" stroke="#0e1438" stroke-width="1.6"/>',
  bot: '<rect x="4" y="7" width="16" height="12" rx="4" fill="currentColor"/><circle cx="9" cy="13" r="1.8" fill="#0e1438"/><circle cx="15" cy="13" r="1.8" fill="#0e1438"/><path d="M12 7V3.5" stroke="currentColor" stroke-width="2"/>',
  pessoas: '<circle cx="8.5" cy="8" r="3.6" fill="currentColor"/><path d="M1.8 20c0-4.4 3-6.9 6.7-6.9s6.7 2.5 6.7 6.9z" fill="currentColor"/><circle cx="16.6" cy="9" r="3" fill="currentColor"/><path d="M15.8 13.4c3.6-.3 6.4 1.9 6.4 6.6h-5.3" fill="currentColor"/>',
  relogio: '<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 8.5V13l3 2M9.5 2.5h5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  portal: '<ellipse cx="12" cy="12" rx="7" ry="9" fill="none" stroke="currentColor" stroke-width="2.4"/><ellipse cx="12" cy="12" rx="3.5" ry="5" fill="currentColor"/>',
  portao: '<path d="M3 21V6l9-3 9 3v15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M7 21V9M12 21V8M17 21V9" stroke="currentColor" stroke-width="2.2"/>',
  botao: '<ellipse cx="12" cy="16" rx="9" ry="4" fill="currentColor" opacity=".45"/><ellipse cx="12" cy="12.5" rx="6.5" ry="3.4" fill="currentColor"/>',
  zona: '<rect x="3" y="5" width="18" height="14" rx="2" fill="currentColor" opacity=".35"/><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.4"/>',
  gol: '<path d="M3 20V6h18v14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M6 9h12M6 12.5h12M6 16h12M9 6v14M12 6v14M15 6v14" stroke="currentColor" stroke-width="1" opacity=".7"/>',
  texto: '<path d="M4 6V4h16v2M12 4v16M8.5 20h7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  enfeite: '<path d="M12 2.8l2.8 6 6.5.7-4.8 4.4 1.3 6.4L12 17l-5.8 3.3 1.3-6.4L2.7 9.5l6.5-.7z" fill="currentColor"/>',
  marca: '<path d="M3 12h4M10 12h4M17 12h4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  bola: '<circle cx="12" cy="12" r="9" fill="#fff" stroke="currentColor" stroke-width="2"/><path d="M12 7.5l3.4 2.5-1.3 4H9.9l-1.3-4z" fill="currentColor"/>',
  chutar: '<circle cx="7.5" cy="16.5" r="5" fill="#fff" stroke="currentColor" stroke-width="2"/><path d="M12 12l7.5-7.5M13.5 4.5h6v6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  pontos: '<circle cx="4.5" cy="12" r="3" fill="currentColor"/><circle cx="11.5" cy="12" r="2.4" fill="currentColor" opacity=".8"/><circle cx="17.6" cy="12" r="1.8" fill="currentColor" opacity=".6"/><circle cx="22" cy="12" r="1.2" fill="currentColor" opacity=".4"/>',   // v95: as linhas da bola (RANK OFF)
  ladoOposto: '<path d="M12 2.5v19" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 2"/><path d="M9 7L3 17h6z" fill="currentColor"/><path d="M15 7l6 10h-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 4.5h5M17.5 3l1.6 1.5-1.6 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  repetir: '<rect x="2.5" y="8.5" width="5.4" height="7" rx="1.2" fill="currentColor"/><rect x="9.3" y="8.5" width="5.4" height="7" rx="1.2" fill="currentColor" opacity=".7"/><rect x="16.1" y="8.5" width="5.4" height="7" rx="1.2" fill="currentColor" opacity=".42"/><path d="M4 5.5h15.5M17.5 3.8l2 1.7-2 1.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  oficina: '<path d="M14.5 3.5a5 5 0 0 0-4.7 6.7L3.5 16.5a2.1 2.1 0 0 0 3 3l6.3-6.3a5 5 0 0 0 6.7-4.7l-3 3-3-1-1-3z" fill="currentColor"/>',
  mapa: '<path d="M3 6l6-2.5 6 2.5 6-2.5v14.5l-6 2.5-6-2.5-6 2.5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 3.5v14.5M15 6v14.5" stroke="currentColor" stroke-width="2"/>',
  pasta: '<path d="M3 6h7l2 2.5h9V19H3z" fill="currentColor"/>',
  fogo: '<path d="M12 22c4.4 0 7-2.9 7-6.6 0-4.4-3.4-6.6-4.6-10.4-1.6 1.8-2 3.8-1.6 5.8-1.6-.8-2.8-2.4-3-4.4C7.4 8.6 5 11.6 5 15.4 5 19.1 7.6 22 12 22z" fill="currentColor"/>',
  novo: '<path d="M12 2l2 5.5L19.5 9 14 11l-2 5.5L10 11 4.5 9 10 7.5z" fill="currentColor"/><path d="M18.5 15l1 2.7 2.7 1-2.7 1-1 2.8-1-2.8-2.7-1 2.7-1z" fill="currentColor"/>',
  trofeu: '<path d="M7 3.5h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10.8" y="13" width="2.4" height="4" fill="currentColor"/><rect x="7.5" y="17" width="9" height="3.2" rx="1" fill="currentColor"/>',
  escudo: '<path d="M12 2.5l8 3v6.2c0 4.8-3.4 8.4-8 9.8-4.6-1.4-8-5-8-9.8V5.5z" fill="currentColor"/><path d="M8.3 12.2l2.6 2.6 5-5" fill="none" stroke="#0e1438" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>',
  painel: '<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M14 4v16" stroke="currentColor" stroke-width="2.2"/><path d="M16.5 8h2M16.5 11h2M16.5 14h2" stroke="currentColor" stroke-width="1.6"/>',
  multi: '<rect x="3" y="3" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13" y="13" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 4l2.5 2.5L21 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3 15l2.5 2.5L10 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};
const icone = (n, cls) => { const i = document.createElement('i'); i.className = 'ofi-ic' + (cls ? ' ' + cls : ''); i.setAttribute('aria-hidden', 'true'); i.innerHTML = '<svg viewBox="0 0 24 24">' + (IC[n] || IC.mais) + '</svg>'; return i; };

/* ---------------------------------------------------------------- os ajudantes de tela */
// h('div.classe#id', {atributos, on:{click:fn}, style:{}}, filhos…) — texto sempre como texto (nunca HTML)
function h(sel, at, ...filhos) {
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(sel || 'div');
  const e = document.createElement((m && m[1]) || 'div');
  if (m && m[2]) for (const p of m[2].match(/[.#][\w-]+/g) || []) { if (p[0] === '.') e.classList.add(p.slice(1)); else e.id = p.slice(1); }
  if (at && (typeof at !== 'object' || at instanceof Node || Array.isArray(at))) { filhos.unshift(at); at = null; }
  if (at) for (const k in at) {
    const v = at[k]; if (v == null || v === false) continue;
    if (k === 'on') { for (const ev in v) e.addEventListener(ev, v[ev]); }
    else if (k === 'style') { if (typeof v === 'string') e.style.cssText = v; else for (const p in v) { if (p.startsWith('--')) e.style.setProperty(p, v[p]); else e.style[p] = v[p]; } }   // (as variáveis --x só pelo setProperty)
    else if (k === 'texto') e.textContent = v;
    else if (k === 'dados') { for (const d in v) e.dataset[d] = v[d]; }
    else if (k in e && typeof v !== 'string') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat(9)) { if (f == null || f === false) continue; e.appendChild(f instanceof Node ? f : document.createTextNode(String(f))); }
  return e;
}
function botao(rot, fn, cls, ic, titulo) {
  const b = h('button.ofi-bt' + (cls ? '.' + cls.split(' ').join('.') : ''), { type: 'button', title: titulo || (typeof rot === 'string' ? rot : '') || null, 'aria-label': titulo || (typeof rot === 'string' ? rot : null) });
  if (ic) b.appendChild(icone(ic));
  if (rot) b.appendChild(h('span', { texto: rot }));
  if (fn) b.addEventListener('click', e => { e.stopPropagation(); try { som.clique(); } catch (_) {} fn(e); });
  return b;
}
function poe(el, ...filhos) {                         // (el.append sem os nulos: o append de verdade escreveria "null")
  for (const f of filhos.flat(9)) if (f != null && f !== false) el.appendChild(f instanceof Node ? f : document.createTextNode(String(f)));
  return el;
}
const comDados = (el, d) => { for (const k in d) el.dataset[k] = d[k]; return el; };   // (dataset só tem getter: Object.assign quebra no modo estrito)
const limpaFilhos = e => { while (e && e.firstChild) e.removeChild(e.firstChild); return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const arred = (v, c) => Math.round(v * (c || 100)) / (c || 100);
const novoIdLocal = () => 'l' + Date.now().toString(36) + Math.floor(Math.random() * 1e8).toString(36);
const quando = t => { if (!t) return ''; const d = new Date(t), a = Date.now() - t; if (a < 60e3) return 'agora'; if (a < 3600e3) return Math.round(a / 60e3) + ' min atrás'; if (a < 864e5) return Math.round(a / 3600e3) + ' h atrás'; return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); };
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' mi' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + ' mil' : String(n | 0);
function aviso(t, tipo) {                              // o recado rápido da Oficina (em cima de tudo)
  const raiz = OFI.raiz || document.body;
  let a = raiz.querySelector('.ofi-aviso');
  if (!a) { a = h('div.ofi-aviso', { role: 'status', 'aria-live': 'polite' }); raiz.appendChild(a); }
  a.textContent = t; a.className = 'ofi-aviso' + (tipo ? ' ' + tipo : '') + ' on';
  clearTimeout(aviso.t); aviso.t = setTimeout(() => { a.classList.remove('on'); }, tipo === 'erro' ? 4800 : 3200);
}

/* ---------------------------------------------------------------- as janelas (confirmar, perguntar, escolher) */
function janela(titulo, monta, acoes, cls) {
  return new Promise(res => {
    const fundo = h('div.ofi-jan-fundo', { role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });
    if (cls) for (const c of String(cls).split(/\s+/)) if (c) fundo.classList.add(c);   // (várias classes: 'ofi-jan-larga ofi-jan-det')
    const caixa = h('div.ofi-jan');
    const fecha = v => { fundo.remove(); document.removeEventListener('keydown', tecla, true); res(v); };
    const tecla = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecha(null); } };
    caixa.appendChild(h('div.ofi-jan-tit', h('b', { texto: titulo }), botao('', () => fecha(null), 'ofi-x', 'fechar', 'Fechar')));
    const corpo = h('div.ofi-jan-corpo'); caixa.appendChild(corpo);
    const ctx = { fecha, corpo };
    if (monta) monta(corpo, ctx);
    if (acoes && acoes.length) {
      const pe = h('div.ofi-jan-pe');
      for (const a of acoes) pe.appendChild(botao(a.rot, () => { const v = a.valor ? a.valor(ctx) : a.v; if (v !== undefined) fecha(v); }, a.cls || '', a.ic));
      caixa.appendChild(pe);
    }
    fundo.appendChild(caixa);
    fundo.addEventListener('pointerdown', e => { if (e.target === fundo) fecha(null); });
    (OFI.raiz || document.body).appendChild(fundo);
    document.addEventListener('keydown', tecla, true);
    const f = caixa.querySelector('input,textarea,select'); if (f) setTimeout(() => { try { f.focus(); } catch (_) {} }, 30);
  });
}
const confirma = (titulo, texto, sim, cls) => janela(titulo, c => c.appendChild(h('p.ofi-jan-tx', { texto })), [{ rot: 'CANCELAR', v: false, cls: 'escuro' }, { rot: sim || 'OK', v: true, cls: cls || 'ama' }]).then(v => !!v);
function pergunta(titulo, rotulo, valor, max, multi) {
  let campo;
  return janela(titulo, c => {
    c.appendChild(h('label.ofi-rot', { texto: rotulo }));
    campo = multi ? h('textarea.ofi-in', { maxLength: max || 300, rows: 4 }) : h('input.ofi-in', { type: 'text', maxLength: max || 40, autocomplete: 'off' });
    campo.value = valor || '';
    if (!multi) campo.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); c.parentNode.querySelector('.ofi-jan-pe .ama').click(); } });
    c.appendChild(campo);
  }, [{ rot: 'CANCELAR', v: null, cls: 'escuro' }, { rot: 'OK', cls: 'ama', valor: () => campo.value }]);
}

/* ---------------------------------------------------------------- A GAVETA: os mapas do aparelho
   'mapas'    {id (local), nome, mapa, criado, editado, thumb, remoto:{id, codigo, versao} | null, publicado, sujo}
   'versoes'  {k: id + ':' + n, mapa: id, n, t, nota, auto, dados} — as últimas MAX_VERSOES_LOCAIS de cada mapa
   'recupera' {id:'sessao', mapa: id, t, dados} — o estado do editor a cada mudança (se o aparelho travar, volta daqui) */
const MAX_VERSOES_LOCAIS = 30;
const GAVETA = {
  db: null, modo: '', mem: { mapas: new Map(), versoes: new Map(), recupera: new Map() },
  abre() {
    if (this.pronta) return this.pronta;
    this.pronta = new Promise(res => {
      let req;
      try { req = indexedDB.open('racha-oficina', 1); } catch (_) { this.modo = 'ls'; return res(this); }
      const t = setTimeout(() => { this.modo = 'ls'; res(this); }, 4000);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('mapas')) db.createObjectStore('mapas', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('versoes')) db.createObjectStore('versoes', { keyPath: 'k' }).createIndex('mapa', 'mapa');
        if (!db.objectStoreNames.contains('recupera')) db.createObjectStore('recupera', { keyPath: 'id' });
      };
      req.onsuccess = () => { clearTimeout(t); this.db = req.result; this.modo = 'idb'; res(this); };
      req.onerror = req.onblocked = () => { clearTimeout(t); this.modo = 'ls'; res(this); };
    }).then(g => { if (g.modo === 'ls') g.carregaLs(); return g; });
    return this.pronta;
  },
  // (sem IndexedDB — janela anônima, navegador velho: o localStorage, com o limite dele)
  carregaLs() { try { const o = JSON.parse(localStorage.getItem('racha-oficina-ls') || 'null'); if (o) for (const k of ['mapas', 'versoes', 'recupera']) for (const x of o[k] || []) this.mem[k].set(x.id || x.k, x); } catch (_) {} },
  gravaLs() {
    clearTimeout(this.lsT); this.lsT = setTimeout(() => {
      const o = { mapas: [...this.mem.mapas.values()], versoes: [...this.mem.versoes.values()].slice(-60), recupera: [...this.mem.recupera.values()] };
      try { localStorage.setItem('racha-oficina-ls', JSON.stringify(o)); }
      catch (_) { o.versoes = []; try { localStorage.setItem('racha-oficina-ls', JSON.stringify(o)); } catch (e) { aviso('O aparelho está sem espaço para guardar os mapas.', 'erro'); } }
    }, 300);
  },
  op(store, modo, fn) {
    return this.abre().then(() => new Promise((res, rej) => {
      if (this.modo !== 'idb') { try { res(fn(null)); } catch (e) { rej(e); } return; }
      let tx; try { tx = this.db.transaction(store, modo); } catch (e) { return rej(e); }
      const os = tx.objectStore(store); let saida;
      const r = fn(os); if (r && 'onsuccess' in r) r.onsuccess = () => { saida = r.result; };
      tx.oncomplete = () => res(saida); tx.onerror = tx.onabort = () => rej(tx.error || new Error('gaveta'));
    }));
  },
  pega(store, id) { return this.op(store, 'readonly', os => os ? os.get(id) : this.mem[store].get(id)); },
  todos(store) { return this.op(store, 'readonly', os => os ? os.getAll() : [...this.mem[store].values()]).then(l => l || []); },
  poe(store, obj) { return this.op(store, 'readwrite', os => { if (os) return os.put(obj); this.mem[store].set(obj.id || obj.k, obj); this.gravaLs(); return null; }); },
  tira(store, id) { return this.op(store, 'readwrite', os => { if (os) return os.delete(id); this.mem[store].delete(id); this.gravaLs(); return null; }); },
  versoesDe(id) {
    return this.op('versoes', 'readonly', os => os ? os.index('mapa').getAll(id) : [...this.mem.versoes.values()].filter(v => v.mapa === id)).then(l => (l || []).sort((a, b) => b.n - a.n));
  },
  async novaVersao(id, dados, nota, auto) {
    const l = await this.versoesDe(id), n = l.length ? l[0].n + 1 : 1;
    await this.poe('versoes', { k: id + ':' + n, mapa: id, n, t: Date.now(), nota: nota || '', auto: !!auto, dados: JSON.parse(JSON.stringify(dados)) });
    const sobra = l.slice(MAX_VERSOES_LOCAIS - 1);    // (as mais velhas saem; as automáticas primeiro)
    sobra.sort((a, b) => (b.auto ? 1 : 0) - (a.auto ? 1 : 0) || a.n - b.n);
    for (const v of sobra.slice(0, Math.max(0, l.length + 1 - MAX_VERSOES_LOCAIS))) await this.tira('versoes', v.k);
    return n;
  },
  async apagaMapa(id) { for (const v of await this.versoesDe(id)) await this.tira('versoes', v.k); await this.tira('mapas', id); const r = await this.pega('recupera', 'sessao'); if (r && r.mapa === id) await this.tira('recupera', 'sessao'); },
};

/* ---------------------------------------------------------------- A CONVERSA com o servidor das salas */
const REDE = { rid: 0, pend: new Map() };
const conectado = () => !!(typeof NET49 !== 'undefined' && NET49.ws && NET49.ws.readyState === 1 && NET49.id);
function temServidor() { try { return !!servidorEndereco(); } catch (_) { return false; } }
function conecta(ms) {                                // abre a conexão do jogo (se tem para onde) e espera o hello
  if (conectado()) return Promise.resolve(true);
  if (!temServidor()) return Promise.resolve(false);
  if (OFI.conectando) return OFI.conectando;
  OFI.conectando = new Promise(res => {
    try { if (!NET49.ws) net49Connect(); } catch (_) {}
    const t0 = Date.now();
    const v = () => { if (conectado()) { OFI.conectando = null; return res(true); } if (Date.now() - t0 > (ms || 9000) || (!NET49.ws && Date.now() - t0 > 600)) { OFI.conectando = null; return res(false); } setTimeout(v, 80); };
    v();
  });
  return OFI.conectando;
}
async function pede(op, args, ms) {                   // → a resposta do servidor ({ok, ...}) · sem servidor: {ok:false, semRede:true}
  if (!(await conecta())) return { ok: false, semRede: true, erro: 'Sem conexão com o servidor das salas agora.' };
  const rid = ++REDE.rid;
  return new Promise(res => {
    const t = setTimeout(() => { REDE.pend.delete(rid); res({ ok: false, erro: 'O servidor demorou para responder. Tente de novo.' }); }, ms || 12000);
    REDE.pend.set(rid, m => { clearTimeout(t); res(m); });
    try { NET49.ws.send(JSON.stringify({ type: 'mapa_req', rid, op, args: args || {} })); }   // ("type" primeiro: o servidor deixa a mensagem grande passar só para o mapa)
    catch (_) { clearTimeout(t); REDE.pend.delete(rid); res({ ok: false, erro: 'Não deu para falar com o servidor.' }); }
  });
}
function mandaSala(m) { try { if (NET49.ws && NET49.ws.readyState === 1) { NET49.ws.send(JSON.stringify(m)); return true; } } catch (_) {} return false; }

/* ---------------------------------------------------------------- os ganchos no jogo
   (ligados só no fim, depois de todos os arquivos da Oficina carregarem: se algum falhar, o jogo segue sem a Oficina) */
function ofiLigaGanchos() {
// 1) o laço do quadro: com a Oficina aberta o jogo dorme; a partida da Oficina (o TESTAR e a sala com mapa) desenha no lugar dele
const ofiFrameAntes = frame;
frame = function (now) {
  if (OFJ.on) { try { OFJ.quadro(now); } catch (e) { console.error('Oficina (partida):', e); try { OFJ.falhou(e); } catch (_) {} } requestAnimationFrame(frame); return; }
  if (OFI.aberta) { last = now; try { fpsTela(now); } catch (_) {} requestAnimationFrame(frame); return; }
  return ofiFrameAntes(now);
};
// 2) as mensagens do servidor: as da Oficina (mapa_res, mapa_sala) e as da sala com mapa (a sala, o começo, os quadros, o fim)
const ofiMsgAntes = net49Message;
net49Message = function (m) {
  if (m && m.type === 'mapa_res') { const f = REDE.pend.get(m.rid); if (f) { REDE.pend.delete(m.rid); f(m); } return; }
  if (m && m.type === 'mapa_sala') { try { OFS.recebeMapa(m); } catch (e) { console.error('Oficina (sala):', e); } return; }
  let tratou = false;
  try { tratou = OFS.trata(m); } catch (e) { console.error('Oficina (sala):', e); }
  if (tratou === true) return;
  const r = ofiMsgAntes.apply(this, arguments);
  try { OFS.depois(m); } catch (e) { console.error('Oficina (sala):', e); }
  return r;
};
// 3) a barra do chat some com a Oficina aberta (a tela da sala com mapa tem o chat dela)
try { const ctxAntes = cbContexto; cbContexto = function () { if (OFI.aberta || OFJ.on) return ''; return ctxAntes.apply(this, arguments); }; } catch (_) {}
// 4) o teclado: com a Oficina aberta, o Esc é dela
window.addEventListener('keydown', e => {
  if (!OFI.aberta || OFJ.on) return;
  if (document.querySelector('.ofi-jan-fundo')) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); OFI.volta(); }
}, true);
// 5) o botão OFICINA na tela inicial
try { const lbLayoutAntes = lbLayout; lbLayout = function () { const r = lbLayoutAntes.apply(this, arguments); try { botaoLobby(); posicionaLobby(); } catch (_) {} try { if (typeof v93GrupoLugar === 'function') v93GrupoLugar(); } catch (_) {} return r; }; } catch (_) {}   // (v93: o grupo procura o lugar livre depois do botão da Oficina)
window.addEventListener('resize', () => { setTimeout(() => { try { posicionaLobby(); } catch (_) {} }, 60); });
setTimeout(() => { try { botaoLobby(); } catch (_) {} }, 0);
OFI.pronta = true;
}

/* ---------------------------------------------------------------- abrir e fechar a Oficina */
OFI.monta = function () {
  if (OFI.raiz) return OFI.raiz;
  OFI.raiz = h('div#ofi.ofi', { hidden: true, 'aria-label': 'Oficina de criação' });
  OFI.raiz.appendChild(h('div.ofi-gire', icone('girar'), h('b', { texto: 'Gire o celular' }), h('span', { texto: 'A Oficina funciona na horizontal, como o jogo.' })));
  document.body.appendChild(OFI.raiz);
  return OFI.raiz;
};
OFI.abre = function (tela, arg) {
  OFI.monta();
  if (!lobby.aberto && !OFJ.on) { try { abrirLobby(); } catch (_) {} }
  OFI.aberta = true; OFI.raiz.hidden = false;
  try { joy.id = null; ptrs.clear(); resetBotoes(); } catch (_) {}
  try { som.lobby(false); } catch (_) {}
  GAVETA.abre();
  OFI.mostra(tela || 'hub', arg);
  try { cbLugar(); } catch (_) {}
};
OFI.fecha = function () {
  if (!OFI.raiz) return;
  OFI.aberta = false; OFI.raiz.hidden = true;
  try { if (OFE.aberto) OFE.fechaJa(); } catch (_) {}
  OFI.tela = '';
  try { if (lobby.aberto) { lbLayout(); lbRender(); lbMusica(); } else abrirLobby(); } catch (_) {}
  try { cbLugar(); } catch (_) {}
};
OFI.telas = {};                                         // id → {el, abre(arg), volta()}
OFI.mostra = function (id, arg) {
  const T = OFI.telas[id]; if (!T) return;
  if (!OFI.aberta || !OFI.raiz) return OFI.abre(id, arg);   // (a Oficina ainda fechada: abre primeiro)
  for (const k in OFI.telas) if (OFI.telas[k].el && k !== id) OFI.telas[k].el.hidden = true;
  if (!T.el) { T.el = T.monta(); OFI.raiz.appendChild(T.el); }
  T.el.hidden = false; OFI.tela = id;
  if (T.abre) T.abre(arg);
};
OFI.volta = function () { const T = OFI.telas[OFI.tela]; if (T && T.volta) T.volta(); else OFI.fecha(); };

/* ---------------------------------------------------------------- o botão OFICINA na tela inicial */
function botaoLobby() {
  const rx = document.getElementById('rx'); if (!rx || document.getElementById('ofi-lobby')) return;
  const b = h('button#ofi-lobby.ofi-lobby', { type: 'button', 'aria-label': 'Oficina: crie mapas e jogue os da comunidade' },
    h('i.ofi-lobby-ic', icone('oficina')), h('span.ofi-lobby-tx', h('b', { texto: 'OFICINA' }), h('small', { texto: 'Crie e jogue mapas' })));
  b.addEventListener('click', e => { e.stopPropagation(); try { som.clique(); } catch (_) {} OFI.abre('hub'); });
  rx.appendChild(b);
  posicionaLobby();
}
function posicionaLobby() {                            // entre a coluna da esquerda e a tampinha, logo acima do PASSE (embaixo do letreiro RACHA)
  const b = document.getElementById('ofi-lobby'); if (!b) return;
  const rx = document.getElementById('rx'), r0 = rx.getBoundingClientRect(); if (!r0.width) return;
  const R = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; };
  const esq = R('#rx .v71-esq') || R('#rx .rx-esq'), passe = R('#lb .v88-passe') || R('#lb .rx-baixo'), dica = R('#lb .v90-dica'), emb = R('#lb-emblema');
  const Wd = r0.width, Hd = r0.height, k = r0.width / (rx.offsetWidth || r0.width) || 1;   // (o palco do lobby é desenhado grande e encolhido: as contas são na tela, o estilo no palco)
  const alto = clamp(Hd * .11, 46, 72);                // (o toque mínimo do jogo: 44 px)
  const folga = clamp(Wd * .015, 6, 24), folgaY = clamp(Hd * .02, 5, 16), x0 = (esq ? esq.right : Wd * .1) + clamp(Wd * .02, 8, 30);
  const cruza = (q, y) => !!q && q.bottom > y + 1 && q.top < y + alto - 1;   // (a faixa de altura do botão passa por q?)
  // v95: na fileira do TREINO, do lado dele (a mesma altura e o mesmo alto: a coluna e a OFICINA formam uma fileira só)
  const treino = R('#rx .v71-esq [data-rx="treino"]');
  if (treino && esq && document.documentElement.classList.contains('v95v')) {
    const gx = clamp(Wd * .012, 6, 16), xa = treino.right + gx;
    let xb = xa + clamp(Wd * .2, 150, 300);
    if (emb && emb.bottom > treino.top && emb.top < treino.bottom) xb = Math.min(xb, emb.left - folga);
    const lg = clamp(xb - xa, 110, 300), at = treino.height, lv = Math.min(at / 70, lg / 200);
    b.style.left = Math.round((xa - r0.left) / k) + 'px'; b.style.top = Math.round((treino.top - r0.top) / k) + 'px';
    b.style.width = Math.round(lg / k) + 'px'; b.style.height = Math.round(at / k) + 'px';
    b.style.setProperty('--ofi-l', String(lv / k));
    b.classList.toggle('estreito', lv < 0.74);
    return;
  }
  const baseY = passe ? passe.top : Hd - 90;
  let y = Math.max(Hd * .3, baseY - alto - clamp(Hd * .035, 8, 26));
  // o letreiro "segure para trocar" embaixo da tampinha: sem lugar do lado dele, o botão sobe para cima dele (nada fica por baixo)
  if (dica && cruza(dica, y) && dica.left - folga - x0 < 110) y = Math.max(Hd * .3, dica.top - folgaY - alto);
  let x1 = Math.min(cruza(dica, y) ? dica.left - folga : Infinity, x0 + 280);
  if (cruza(emb, y)) x1 = Math.min(x1, emb.left - folga);   // (nem encosta na caixa da tampinha, que também é botão)
  const larg = clamp(x1 - x0, 110, 280), l = Math.min(alto / 60, larg / 190);   // (a letra acompanha a largura que sobrou)
  b.style.left = Math.round((x0 - r0.left) / k) + 'px'; b.style.top = Math.round((y - r0.top) / k) + 'px';
  b.style.width = Math.round(larg / k) + 'px'; b.style.height = Math.round(alto / k) + 'px';
  b.style.setProperty('--ofi-l', String(l / k));
  b.classList.toggle('estreito', l < 0.74);            // (estreito: só OFICINA, sem o "crie seus mapas" miudinho)
}
