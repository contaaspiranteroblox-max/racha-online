# RACHA rua v70 · Etapa 6 — polimento (trocas fora do bloco de física).
# Nomes iguais entre o botão e o destino (TAMPINHA, que se personaliza), uma só gema (laranja com o losango branco), e os
# textos que ainda falavam do VESTIÁRIO e das SKINS antigas. O resto mora em tools/v70/polimento.js (contorno dos times e
# VOCÊ em campo, janelas com foco preso, Escape por camada, cartões e abas acessíveis, menos animação do sistema) e no fim
# de app/public/game/v70.css (as cores por papel, o foco visível e o desabilitado).
# Cada item: (antes, depois) = exatamente 1 vez no arquivo gerado · (antes, depois, n) = exatamente n vezes.

SUBS = [
  # ---- 1) TAMPINHA: o botão do lobby (aplicar_rua.py) e a tela que ele abre têm o mesmo nome
  ('<section class="lb-tela" id="tela-skins" hidden aria-label="Skins">',
   '<section class="lb-tela" id="tela-skins" hidden aria-label="Sua tampinha">'),
  ('<h2>SKINS</h2>', '<h2>SUA TAMPINHA</h2>'),
  # o nome de cada tela para o leitor de tela é o mesmo do botão que abre
  ('<section class="lb-tela" id="tela-amigos" hidden aria-label="Amigos">', '<section class="lb-tela" id="tela-amigos" hidden aria-label="Salas">'),
  ('<section class="lb-tela" id="tela-treino" hidden aria-label="Treino">', '<section class="lb-tela" id="tela-treino" hidden aria-label="Treinamento">'),
  # a apresentação (primeira vez): não existe mais VESTIÁRIO no lobby; o lugar é TAMPINHA
  ('Dá para trocar quando quiser no VESTIÁRIO. Agora, 20 segundos de aquecimento.',
   'Dá para personalizar quando quiser em TAMPINHA, no lobby. Agora, 20 segundos de aquecimento.', 2),
  ("'Tem mais ' + SKINS.filter(s => s.r !== 'inicial').length + ' discos em SKINS, no VESTIÁRIO. Agora, 20 segundos de aquecimento.'",
   "'As cores, a borda e o ícone você personaliza quando quiser em TAMPINHA, no lobby. Agora, 20 segundos de aquecimento.'"),
  ("Em SKINS, no VESTIÁRIO.'", "Em TAMPINHA, no lobby.'"),
  ('Todos os discos ficam em SKINS: os seus, os da loja e os de conquista.', 'Todos os discos ficam em TAMPINHA: os seus, os da loja e os de conquista.'),
  ('<span class="lb-btn roxo">ABRIR SKINS</span>', '<span class="lb-btn roxo">ABRIR TAMPINHA</span>'),
  # ---- 2) uma só gema: o pacote antigo (escondido) também desenha a gema laranja com o losango branco do .ic-gema
  ("'linear-gradient(135deg, #ff7ad9, #b8128c)', 'gemas'", "'linear-gradient(135deg, #f0a07a, #b34d25)', 'gemas'"),
  ("g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#ff3fd0'; g.beginPath(); g.moveTo(0, -24); g.lineTo(20, -4); g.lineTo(0, 26); g.lineTo(-20, -4); g.closePath(); g.fill(); g.strokeStyle = '#6a0a55'; g.lineWidth = 2.5; g.stroke(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, -24); g.lineTo(8, -4); g.lineTo(0, 0); g.lineTo(-8, -4); g.closePath(); g.fill(); g.restore(); }",
   "g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#d96f45'; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.strokeStyle = '#a94923'; g.lineWidth = 2.5; g.stroke(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -10); g.lineTo(10, 0); g.lineTo(0, 10); g.lineTo(-10, 0); g.closePath(); g.fill(); g.restore(); }"),
]

SUBS_PHYS = []
