/* RACHA · Futebol de Rua — configuração da publicação (v70)
   Este arquivo fica ao lado do racha.html e é lido antes do jogo. Sem ele, o jogo roda como PRODUÇÃO.
   (Uma página que embute o jogo pode definir window.RACHA_CONFIG antes; o que ela definir vale por cima daqui.)

   modo:      'producao' → lançamento: as salas online de verdade (o presente de teste só com o presente: true lá embaixo).
              'demo'     → demonstração: o presente de teste (50.000 moedas e 5.000 gemas) e o selo DEMONSTRAÇÃO no lobby.
                           Numa demonstração SEM servidor (sem 'servidor' e sem salas:'servidor'), as salas online e o
                           Chat do Brasil ficam desligados de forma explícita (o resto do jogo funciona igual).
   presente:  false tira o presente de teste também da demonstração. v87.2: na produção, true dá o presente de TESTE (50.000
              moedas e 5.000 gemas, uma vez por aparelho e por conta), para testar a loja; {id:'2', moedas:100000, gemas:10000}
              dá outro valor (um id novo dá de novo). Para o lançamento, tire a linha do presente lá embaixo. (Na plataforma,
              este arquivo vai para o dist no npm run build: depois de mudar, rode o build de novo e reinicie.)
   servidor:  o endereço do servidor da turma (salas online, Chat do Brasil, clubes da turma e copa), se ele NÃO estiver no
              mesmo endereço do jogo. Ex.: 'meu-racha.onrender.com' ou 'wss://salas.meusite.com'. Vazio = o mesmo endereço
              (node server/servidor.js entrega o jogo e as salas juntos; a plataforma também, quando roda em produção).
   salas:     'servidor' liga as salas numa demonstração (com o servidor do mesmo endereço).
   origensPlataforma: as páginas que podem receber os eventos do jogo (começo e fim de partida, gols de treino), quando o
              jogo está dentro de um iframe de OUTRO endereço. Ex.: ['https://racha.meusite.com']. Vazio = só o mesmo
              endereço do jogo (a plataforma serve o jogo em /game/racha.html). Nunca vai para '*'. */
window.RACHA_CONFIG = Object.assign({
  modo: 'producao',
  presente: true            // v87.2: o presente de TESTE (moedas e gemas) — apague esta linha no lançamento
}, window.RACHA_CONFIG || {});
