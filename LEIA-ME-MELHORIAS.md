# RACHA — versão melhorada (a versão oficial, com a v93 e a v94)

> **Atualização de 28/10/2026:** o pacote junta a v93 e a v94 (`racha-online-v94-testes-etapas1a7.zip`) com a Oficina. Continua
> a **versão oficial**: sem o `experimental: true` no `config.js`, sem o `INICIAR-TESTES-NO-WINDOWS.bat`, o
> `INICIAR-TESTES-MOTOR-NOVO-NO-WINDOWS.bat`, o `LEIA-ME-v92-TESTES.md` e o `LEIA-ME-v94-TESTES.md` no ZIP. O motor próprio da v94
> fica desligado (o padrão das salas é o motor de sempre; só a versão de testes liga o outro). O que o painel de testes tinha
> de útil para todo mundo — a fluidez, as linhas da bola, a extrapolação do online, o analógico e a câmera — virou os
> **AJUSTES FINOS** (Ajustes › Visual › ABRIR OS AJUSTES FINOS), guardados no aparelho; a física das partidas continua a
> oficial (ela só se ajusta nas salas da Oficina, no CRIAR SALA).
>
> **Atualização de 27/10/2026 (a pedido: "deixe apenas a versão V92, remova aquilo das configurações"):** o pacote agora é o
> da **v92 oficial**. O `config.js` não tem mais o `experimental: true`, então a aba **AJUSTES › TESTES v92** (perfis v91/v92,
> ajustes de física e rede, memórias A/B, medidores) e os botões **A ⇄ B** e **DB** da pausa não aparecem; o jogo usa o padrão
> da v92. O `INICIAR-TESTES-NO-WINDOWS.bat` (que ligava o servidor de testes) e o `LEIA-ME-v92-TESTES.md` saíram do ZIP, como
> no `tools/v92/pacote.py --producao`. O que está abaixo sobre o painel de testes vale só para quem religar o modo de testes
> de propósito (`experimental: true` no `config.js`). O resto do texto continua valendo.

Esta cópia parte do ZIP `racha-online-v92-testes(1).zip`. Até a atualização acima, a aba AJUSTES › TESTES v92 era mantida, incluindo perfis v91/v92, ajustes de física e rede, memórias A/B, medidores e o atalho da pausa. Os testes automatizados continuam no diretório `tests/`.

## O que mudou

1. A patente oficial não recebe resultados contra bots nem pontos importados do aparelho. A liga contra bots segue local. Treino e partidas sem simulação autoritativa podem ser jogados, mas não creditam XP, moedas, gemas, missões nem estatísticas oficiais. O resultado local continua no histórico do aparelho, mas não no histórico oficial da conta; a API informa essa limitação. A conta só recebe esses benefícios em partidas online simuladas pelo servidor e assinadas com `h:1`.
2. Gols e assistências de uma partida online autoritativa vêm de `gl/as` no selo, não da declaração do aparelho. Selos legados sem essas métricas não dão bônus pessoais nem crédito oficial.
3. Saves do aparelho não criam carteira ou inventário oficial. Uma carteira ainda ausente nasce com o saldo inicial do servidor (500 moedas, 25 gemas). Carteiras já criadas continuam com seus saldos. Migrações legítimas precisam de um procedimento separado baseado em dados confiáveis; esta cópia não inventa um saldo para elas.
4. Exercícios desconhecidos são recusados. Exercícios locais conhecidos mostram uma nota explicando por que não creditam prêmio na conta até haver comprovação no servidor.
5. O editor de HUD só mostra “Controles salvos” após `localStorage.setItem` funcionar; se falhar, fica aberto e informa o erro.
6. A pausa experimental passou a usar duas colunas em telas horizontais baixas, mantendo CONTINUAR, A ⇄ B, DB e SAIR acessíveis.
7. WebSocket limita também a quantidade e a duração de fragmentos, inclusive fragmentos vazios, e rejeita continuações inválidas.
8. A integração contínua verifica TypeScript, testes de regressão de segurança, núcleo/DB v92, HUD e navegação/celular/online/reconexão. Novos testes foram adicionados; os cenários existentes de plataforma e v92 que pressupunham recompensas de dados locais ou config oficial foram atualizados para a regra atual.

## Como testar

O `config.js` mantém só o presente de testes (`presente: true`, a linha a apagar no lançamento) — sem o `experimental`. `node server.js` inicia o servidor de salas e a página, **não** a plataforma completa de contas e economia. Os testes de plataforma usam o harness em `tests/plataforma/` com banco descartável. Para uma implantação real da plataforma é preciso configurar o serviço de `app/` e MySQL separadamente, com as migrações adequadas; o `render.yaml` desta cópia continua voltado ao servidor de salas.

```bash
python3 tools/aplicar_rua.py
cd app && npm ci && npm run check && npm run build && cd ..
node tests/plataforma/compila.cjs
node tests/seguranca_resultados_test.mjs
node tests/ws_fragmentos_test.js
python3 tests/v88_cliente_test.py
python3 tests/v881_jogo_test.py
python3 tests/celular_test.py
python3 tests/hud_salvamento_test.py
python3 tests/v92_test.py
python3 tests/v92_celular_test.py
```

Os testes de navegador exigem Python Playwright e Chromium (`RACHA_CHROME` pode apontar para o executável). Não use os resultados de `tests/saida/logs/` como confirmação desta versão: são saídas antigas preservadas do pacote original.

## Limites conhecidos antes de publicar

- O encerramento da partida ainda distribui estatísticas, XP, moeda, missões, passe e ranking em várias operações. Uma falha entre elas pode deixar créditos parciais ou contar estatísticas duas vezes em uma tentativa repetida. O selo online ainda pode ser marcado como usado antes da conclusão. Isso requer uma transação e idempotência únicas por partida.
- A fila de salas ainda recebe pontos informados pelo cliente; identidade por token de sala, revogação imediata, limites globais de conexão e concorrência da economia ainda precisam de tratamento. Testes em MySQL real, carga, Safari e aparelhos físicos não foram feitos.
- A procedência da mecânica e dos assets descrita em `PROVENIENCIA.md` precisa de revisão de direitos antes de uma distribuição comercial.
- O painel de testes saiu (só a v92 oficial). O presente de testes continua ligado no `config.js` (apague a linha `presente: true` antes de um lançamento de verdade).

O relatório `Auditoria-Completa-RACHA-v92.md` entregue separadamente descreve o restante dos riscos e o plano de melhorias. Esta versão cobre um subconjunto prioritário sem redesenhar ou reescrever a física do jogo.
