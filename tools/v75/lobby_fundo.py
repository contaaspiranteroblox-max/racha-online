#!/usr/bin/env python3
"""RACHA rua v75 · o fundo do lobby: a imagem enviada (tools/v75/lobby_fundo_original.png, 1844 × 853 — a quadra da favela
com o Rio de Janeiro atrás: o Cristo, o Pão de Açúcar e a praia no fim de tarde) vira tools/v75/lobby_fundo.webp, que é a
que o build embute no jogo (tools/v75/lobby.js desenha). Mesma imagem e mesmo tamanho; só a compressão muda (WebP 85).
Rodar: python3 tools/v75/lobby_fundo.py
"""
import pathlib
from PIL import Image

AQUI = pathlib.Path(__file__).resolve().parent
im = Image.open(AQUI / 'lobby_fundo_original.png').convert('RGB')
im.save(AQUI / 'lobby_fundo.webp', 'WEBP', quality=85, method=6)
print('lobby_fundo.webp', im.size, (AQUI / 'lobby_fundo.webp').stat().st_size, 'bytes')
