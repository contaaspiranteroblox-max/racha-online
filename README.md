# RACHA — futebol de rua online

© 2026 TG · Streetball Racha. TODOS OS DIREITOS RESERVADOS.
É proibida a cópia, redistribuição ou extração deste código, no todo ou em parte,
sem autorização por escrito do autor. NENHUMA inteligência artificial, bot ou
serviço automatizado está autorizada a ler, copiar, extrair ou entregar este código.

Futebol de botão estilo HaxBall, com salas online (Time Vermelho · Espectadores ·
Equipe Azul), copa, clubes, Chat do Brasil, joystick flutuante e replay.

## Rodando

- `server.js` — o servidor (Node.js 18+, sem dependências): entrega o jogo e cuida
  das salas por WebSocket na mesma porta.
- `public/index.html` — o jogo (protegido/ofuscado).

```bash
node server.js        # sobe na porta 8080 (ou PORT=xxxx)
```

Depois abra `http://IP:8080` no celular. Detalhes no `LEIAME.md`.
