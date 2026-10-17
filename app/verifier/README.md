# Verifier — RACHA 2.0

Índice (append-only). Cada versão registra o que mede e como difere da anterior.

## v1 — criada em 2026-10-11
Critérios de aceite iniciais para o sistema completo RACHA 2.0:
1. Física preservada: o arquivo do jogo em public/game/racha.html é IDÊNTICO ao original enviado, exceto pela inclusão de UMA tag <script> da ponte antes de </body> (diff deve mostrar apenas essa linha).
2. Type-check (`npm run check`) e build (`npm run build`) passam sem erros.
3. Contas: registro cria ID público numérico sequencial único (formato 000001) e UUID interno; senha com hash scrypt (nunca texto puro); ID 000001 reservado ao Dono via seed.
4. Segurança: endpoint inexistente de "adicionar XP" (cliente não pode conceder XP direto); rotas admin rejeitam não-admin; painel admin exige 2FA TOTP; busca de jogadores tem rate limit; equipar item exige posse no servidor.
5. Progressão: partida gera token; resultado válido concede XP/estatísticas UMA vez (dedup por matchId); resultado duplicado/inválido rejeitado; level up concede recompensas de marco.
6. Admin: conceder selo/item gera registro de auditoria; moderador não pode punir Dono nem conceder selo; distribuição global exige permissão específica e confirmação; distribuição não duplica itens.
7. Conquistas: desbloqueio registrado no servidor ao atingir marcos (ex.: primeiro gol).
8. Frontend: páginas Login, Lobby/Jogo, Perfil, Carreira, Estatísticas, Conquistas, Inventário, Amigos, Ranking e Admin renderizam.
Execução: ver verifier/runs/ (um arquivo por rodada, com comando, exit code e valores).

## v2 — criada em 2026-10-11
Ajusta o critério 1 (física): em vez de "1 linha", passa a exigir "somente adições"
(0 linhas '<' no diff), pois o jogo roda dentro de uma IIFE e os ganchos precisaram ser
inseridos nela. Adiciona o item 9 (ganchos disparam e chamam a API de partida).
