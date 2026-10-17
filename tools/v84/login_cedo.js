/* ============================================================================
   RACHA v84 — LOGIN OBRIGATÓRIO sem o site.
   Quando o jogo abre DENTRO do site (iframe), quem manda é a ponte de lá
   (window.parent.RACHA_JOGO) e este módulo fica inerte. Quando o jogo abre
   direto (o arquivo, o APK), este módulo fala com a plataforma por HTTP:
   entrar, criar conta, recuperar senha — e monta a MESMA ponte RACHA_JOGO
   (versão 84) que o site daria, sobre o mesmo backend. Senha nunca vai para
   o armazenamento comum: só o token da sessão fica no aparelho.
   ============================================================================ */
(function(){
  'use strict';
  var EMB = false;
  try { EMB = !!(window.parent && window.parent !== window); } catch (e) {}
  var LS = null; try { LS = window.localStorage; } catch (e) {}
  function le(k){ try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
  function grava(k, v){ try { if (!LS) return; if (v === null || v === undefined) LS.removeItem(k); else LS.setItem(k, String(v)); } catch (e) {} }
  function json(s){ try { return JSON.parse(s); } catch (e) { return null; } }

  var R84 = window.RACHA84 = {
    versao: 84, embutido: EMB, pronto: false, eu: null, ouvintes: [],
    token: le('racha84_token') || null,

    // O endereço da plataforma: o config.js (https) ou, no próprio site, a mesma origem.
    base: function(){
      try {
        var c = window.RACHA_CONFIG || {};
        if (typeof c.plataforma === 'string' && /^https:\/\/[^\/\s]+$/.test(c.plataforma.trim())) return c.plataforma.trim();
      } catch (e) {}
      return /^https?:$/.test(location.protocol) ? location.origin : '';
    },

    // tRPC httpBatchLink na mão (o jogo não carrega o cliente do site):
    // query → GET ?batch=1&input={"0":{"json":...}} · mutation → POST mesmo corpo.
    api: function(proc, input, ehQuery){
      var base = R84.base();
      if (!base) return Promise.reject(new Error('sem plataforma'));
      var corpo = JSON.stringify({ 0: { json: input === undefined ? null : input } });
      var url = base + '/api/trpc/' + proc + '?batch=1' + (ehQuery ? '&input=' + encodeURIComponent(corpo) : '');
      var cab = { 'content-type': 'application/json' };
      if (R84.token) cab['authorization'] = 'Bearer ' + R84.token;
      return fetch(url, {
        method: ehQuery ? 'GET' : 'POST',
        headers: cab,
        credentials: 'include',
        body: ehQuery ? undefined : corpo
      }).then(function(r){
        return r.text().then(function(tx){
          var l = json(tx);
          if (!r.ok){
            var msg = 'Erro ' + r.status;
            try { if (l && l[0] && l[0].error && l[0].error.json) msg = l[0].error.json.message || msg; } catch (e) {}
            var er = new Error(msg); er.status = r.status; throw er;
          }
          var um = Array.isArray(l) ? l[0] : null;
          if (um && um.error){
            var em = 'Erro na plataforma';
            try { em = um.error.json.message || em; } catch (e) {}
            var e2 = new Error(em); e2.status = r.status; throw e2;
          }
          return um && um.result && um.result.data ? um.result.data.json : null;
        });
      });
    },

    logado: function(){ return !!(R84.eu && R84.token); },

    // A conta no formato que o jogo espera (o mesmo do lado do site, ponteJogo.ts)
    contaJogo: function(c){
      if (!c) return null;
      var xp = Math.max(0, Number(c.xp) | 0), n = 1;
      function total(nv){ nv = Math.max(1, Math.min(100, Math.floor(nv))); return 50 * nv * (nv - 1); }
      while (n < 100 && total(n + 1) <= xp) n++;
      var base = total(n), prox = n >= 100 ? base : total(n + 1);
      return {
        idPublico: String(c.idPublico), nome: String(c.nomeExibicao || c.nome || 'Jogador'),
        tampa: c.tampa || null, selos: Array.isArray(c.selos) ? c.selos.slice() : [],
        nivel: c.nivel | 0 || n, xp: xp,
        nivelInfo: { n: n, atual: Math.max(0, xp - base), prox: Math.max(1, prox - base) },
        rq: c.rq ? c.rq : null
      };
    },

    avisa: function(ev){
      var l = R84.ouvintes.slice();
      for (var i = 0; i < l.length; i++){ try { l[i](ev); } catch (e) {} }
    },

    // A conta entrou (login, cadastro ou sessão validada): guarda o token e a conta
    entrou: function(res){
      if (!res) return;
      if (res.token){ R84.token = String(res.token); grava('racha84_token', R84.token); }
      if (res.conta){ R84.eu = res.conta; grava('racha84_conta', JSON.stringify(res.conta)); }
      R84.avisa({ tipo: 'conta', conta: R84.contaJogo(R84.eu) });
    },

    saiu: function(){
      R84.eu = null; R84.token = null;
      grava('racha84_token', null); grava('racha84_conta', null);
      R84.avisa({ tipo: 'conta', conta: null });
    }
  };

  // a conta do cache (a tela de login abre já sabendo quem era; a validação vem depois)
  var cache = json(le('racha84_conta'));
  if (cache && cache.idPublico && R84.token) R84.eu = cache;
  else if (!R84.token){ grava('racha84_conta', null); }

  // A ponte RACHA_JOGO por HTTP — o mesmo contrato da ponte do site (versão 84)
  R84.ponte = {
    versao: 84,
    conta: function(){ return R84.contaJogo(R84.eu); },
    inventario: function(){ return R84.api('perfil.meuInventario', undefined, true).then(function(l){ return (Array.isArray(l) ? l : []).filter(function(i){ return i.categoria === 'skin'; }).map(function(i){ return i.codigo; }); }); },
    tampa: function(codigo){ return R84.api('clubes.salvarTampa', { codigo: codigo }); },
    bilheteSala: function(){ return R84.api('jogo.bilheteSala', {}).then(function(r){ return r && r.bilhete ? r.bilhete : null; }); },
    clubes: {
      listar: function(busca){ return R84.api('clubes.listar', { busca: busca }, true); },
      meu: function(){ return R84.api('clubes.meu', undefined, true); },
      ver: function(id){ return R84.api('clubes.ver', { id: id }, true); },
      criar: function(f){ return R84.api('clubes.criar', f); },
      editar: function(id, f){ var o = f || {}; o.id = id; return R84.api('clubes.editar', o); },
      entrar: function(id){ return R84.api('clubes.entrar', { id: id }); },
      sair: function(){ return R84.api('clubes.sair', {}); },
      convidar: function(termo){ return R84.api('clubes.convidar', { termo: termo }); },
      convites: function(){ return R84.api('clubes.convites', undefined, true); },
      responder: function(id, aceitar){ return R84.api('clubes.responder', { id: id, aceitar: !!aceitar }); },
      expulsar: function(idPublico){ return R84.api('clubes.expulsar', { id: idPublico }); },
      passarDono: function(idPublico){ return R84.api('clubes.passarDono', { id: idPublico }); }
    },
    progresso: {
      inicial: function(){ return undefined; },   // (standalone: a cópia chega pela conta.js → c82BuscaNuvem)
      carregar: function(){ return R84.api('progresso.carregar', undefined, true); },
      salvar: function(versaoBase, dados, aparelho){ return R84.api('progresso.salvar', { versaoBase: versaoBase, dados: dados, aparelho: aparelho }); }
    },
    patente: {
      minha: function(){ return R84.api('perfil.minhaPatente', undefined, true); },
      ranking: function(limite){ return R84.api('perfil.rankingPatentes', { limite: limite || 100 }, true); },
      importar: function(pts){ return R84.api('perfil.importarPatente', { pts: pts }); }
    },
    ouvir: function(fn){
      R84.ouvintes.push(fn);
      return function(){ var i = R84.ouvintes.indexOf(fn); if (i >= 0) R84.ouvintes.splice(i, 1); };
    }
  };

  // Sem o site, esta é a ponte que o jogo usa (o c82Pl e o R82 caem nela)
  if (!EMB) window.RACHA_JOGO_LOCAL = R84.ponte;
})();
</script>
<script>
