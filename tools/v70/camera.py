# RACHA rua v70 · Etapa 2 — câmeras
# A câmera inteira num lugar só (antes: alvoCamera/updateCamera do jogo + os embrulhos da v67 no partida_rua.js).
# Mantém os cinco jeitos (Seguir jogador, À frente, Seguir bola, Transmissão, Tela parada) e acrescenta os enquadramentos
# (Perto, Equilibrado, Campo inteiro, Personalizado), a proteção do seu jogador, a mola amortecida, o zoom automático opcional,
# as setinhas fora da tela que não ficam embaixo dos controles, a sua posição quando a câmera pode deixar você de fora e a
# câmera do espectador (que diz quem está acompanhando e troca de alvo).

CAM_ANTES = r"""// a câmera da base: o ponto entre a tampinha e a bola, puxado 75% para a tampinha (a v70 troca)
// do jogador quando a separação excede a dimensão visível menos a margem.
// Zoom percentual e limites do nosso Canvas são adaptações ao campo existente.
function alvoCamera(hw,hh){                            // v19.1: segue as posições desenhadas (VIS), senão a câmera herdava os trancos
  const w=Math.max(0,Math.min(1,cam.desl/DESL_MAX));   // v27: Câmera puxada para a bola (10 = no ponto médio, como sempre foi; 0 = em cima de você)
  let x=VIS.px*(1-w)+(VIS.px+VIS.bx)/2*w,y=VIS.py*(1-w)+(VIS.py+VIS.by)/2*w;
  if(Math.abs(VIS.bx-VIS.px)>2*hw-4*R_JOG) x+=(VIS.px-x)*.75;
  if(Math.abs(VIS.by-VIS.py)>2*hh-R_JOG) y+=(VIS.py-y)*.75;
  return {x,y};
}
function updateCamera(dt,snap){
  dt=Math.max(0,Math.min(dt,.05));
  const tz=zoomAlvo(),kz=1-Math.exp(-CAM_ZOOM_SUAVE*dt);
  const zoomLimit=(editing?3:CAM_ZOOM_VEL_MAX)*dt,dz=(tz-cam.z)*kz;   // v27: no editor o zoom responde depressa ao deslizante
  cam.z=snap?tz:cam.z+Math.max(-zoomLimit,Math.min(zoomLimit,dz));
  const hw=W/(2*cam.z),hh=H/(2*cam.z);
  const target=cam.mode==='seguir'?alvoCamera(hw,hh):{x:CX,y:CY};
  if(X49?.camera==='stable'&&!snap&&cam.mode==='seguir'){const margin=8/cam.z;target.x-=Math.max(-margin,Math.min(margin,target.x-cam.x));target.y-=Math.max(-margin,Math.min(margin,target.y-cam.y));}
  const k=snap?1:1-Math.pow(.5,dt/CAM_MEIA_VIDA);
  cam.x+=(target.x-cam.x)*k;cam.y+=(target.y-cam.y)*k;
  // v20: a câmera não mostra fora do mundo; se o mundo é menor que a tela naquele eixo, fica centralizada
  cam.x = 2*hw >= MW ? MW/2 : Math.max(hw, Math.min(MW-hw, cam.x));
  cam.y = 2*hh >= MH ? MH/2 : Math.max(hh, Math.min(MH-hh, cam.y));
}"""

CAM_DEPOIS = r"""/* ---------- v70: a câmera (uma implementação só) ----------
   cam.mode: 'seguir' (anda) | 'fixa' (Tela parada: o quadro inteiro do modo). cam.estilo, andando: 'jogador' (Seguir jogador),
   'frente' (À frente), 'bola' (Seguir bola) ou 'tv' (Transmissão).
   cam.preset: o enquadramento — 'perto', 'equilibrado' e 'campo' (Campo inteiro) se ajustam ao tamanho do time (1v1 a 4v4);
   'pers' (Personalizado) usa o deslizante de zoom (cam.zoom, em % do enquadramento de sempre). cam.desl (Deslocamento) vale no
   Seguir jogador: 0 = em cima de você, 10 = no meio entre você e a bola.
   cam.auto (Zoom automático, opcional): abre até 30% quando você e a bola não cabem juntos e volta com calma; a folga entre
   abrir e fechar evita o vaivém. X49.camera 'stable' (Câmera firme): tremidas pequenas do alvo não mexem a câmera.
   Garantia do Seguir jogador e do À frente: o seu jogador, com o corpo inteiro e uma folga (CAM_FOLGA_CORPO raios), fica sempre
   dentro da área livre da tela — fora do placar e longe dos controles (camLivre). Quando você e a bola não cabem juntos, a câmera
   fica com você, do lado oposto ao da bola (nunca num ponto do meio que esconde os dois), e a bola fora da tela ganha a setinha.
   A suavização é uma mola amortecida (sem tranco quando o alvo pula, sem o atraso grande do Lerp antigo). */
const CAM_ESTILOS = ['jogador', 'frente', 'bola', 'tv'];
const CAM_PRESETS = ['perto', 'equilibrado', 'campo', 'pers'];
const CAM_PRESET_PCT = {perto:[126, 124, 120, 116], equilibrado:[100, 95, 88, 80]};   // % do enquadramento de sempre, do 1v1 ao 4v4
const CAM_MOLA = {jogador:.24, frente:.26, bola:.2, tv:.34};   // s: o tempo da mola de cada estilo (a Câmera firme soma um pouco)
const CAM_FOLGA_CORPO = 1.6;                           // a folga em volta do seu jogador, em raios dele (o corpo inteiro e mais um pouco)
const CAMV = {vx:0, vy:0, z:0, zAlvo:0, lx:null, ly:null, svx:0, svy:0, ax:0, ay:0, n:0};
const ESPEC = {alvo:-1};                               // quem o espectador acompanha: -1 = a bola · i = RQ.jog[i]
function camN(){ return RQ.on ? Math.max(1, Math.min(4, RQ.n | 0)) : 1; }
function camZoomDe(p){                                 // a escala de um enquadramento (sem o zoom automático)
  if (p === 'campo'){ const m = Math.max(R_JOG*2.2, (GB - GT - (LY1 - LY0))/2 + MARGEM_Y*.5); return Math.min(W/(LX1 - LX0 + 2*m), H/(LY1 - LY0 + 2*m)); }   // a quadra inteira, com uma folga (v85: a folga cobre a beira onde a tampinha anda, para a câmera não cortar a quadra)
  const pct = CAM_PRESET_PCT[p] ? CAM_PRESET_PCT[p][camN() - 1] : cam.zoom;
  return Math.max(.2, Math.min(ZOOM_MAX, ARC_ZOOM_BASE*(pct/ZOOM_PADRAO)));
}
function camZoomPreset(){ return camZoomDe(cam.preset); }
function camPresetPct(p){ return Math.round(100*camZoomDe(p)/ARC_ZOOM_BASE); }   // (o painel mostra o % de cada enquadramento no tamanho de time de agora)
function camLivre(){                                   // a área livre da tela (px da tela virtual): sem o placar em cima e longe dos controles dos lados
  let L = 40, R = 40;
  for (const k of ['joy', 'kick', 'power', 'curva', 'finta', 'drible']){
    if (!hud[k] || !controleVisivel(k)) continue;
    const e = el(k), lado = e.x < W/2;
    if (lado) L = Math.max(L, (e.x + e.r)*.6); else R = Math.max(R, (W - e.x + e.r)*.6);
  }
  return {L:Math.min(L, 320), R:Math.min(R, 320), T:118, B:36};
}
function camFoco(){                                    // quem a câmera protege e acompanha: você; o espectador escolhe (ou a bola)
  if (NET49.playing && NET49.localSlot < 0){
    const q = ESPEC.alvo >= 0 ? RQ.jog[ESPEC.alvo] : null;
    return q ? {x:q.x, y:q.y, r:q.r, protege:true, q} : {x:VIS.bx, y:VIS.by, r:B.r, protege:false, q:null};
  }
  return {x:VIS.px, y:VIS.py, r:P.r, protege:true, q:P};
}
function camProtege(x, y, F, hw, hh, z){               // o centro de câmera mais perto de (x, y) que deixa F, com a folga, inteiro na área livre
  const A = camLivre(), m = F.r*CAM_FOLGA_CORPO;
  const x0 = F.x - (hw - A.R/z - m), x1 = F.x + (hw - A.L/z - m), y0 = F.y - (hh - A.B/z - m), y1 = F.y + (hh - A.T/z - m);
  return {x:x0 <= x1 ? Math.max(x0, Math.min(x1, x)) : F.x + (A.R - A.L)/(2*z), y:y0 <= y1 ? Math.max(y0, Math.min(y1, y)) : F.y + (A.B - A.T)/(2*z)};
}
function camCorrida(dt, F, snap, hw, hh){              // a velocidade de quem a câmera acompanha (suavizada) e o "à frente" dela (também suavizado)
  if (CAMV.lx === null || snap || !(dt > 0) || Math.hypot(F.x - CAMV.lx, F.y - CAMV.ly) > 400){ CAMV.lx = F.x; CAMV.ly = F.y; CAMV.svx = CAMV.svy = 0; if (snap) CAMV.ax = CAMV.ay = 0; return; }
  const vx = (F.x - CAMV.lx)/dt, vy = (F.y - CAMV.ly)/dt; CAMV.lx = F.x; CAMV.ly = F.y;
  const kv = 1 - Math.exp(-7*dt); CAMV.svx += (vx - CAMV.svx)*kv; CAMV.svy += (vy - CAMV.svy)*kv;
  // um pedaço da tela para onde se corre: pouco no Seguir jogador, mais no À frente (a troca de direção não dá tranco)
  const sp = Math.hypot(CAMV.svx, CAMV.svy), f = Math.min(1, sp/(VEL_JOG*.85)), lead = cam.estilo === 'frente' ? .32 : .08;
  const tx = sp > 1 ? CAMV.svx/sp*f*hw*lead : 0, ty = sp > 1 ? CAMV.svy/sp*f*hh*lead : 0, ka = 1 - Math.exp(-2.4*dt);
  CAMV.ax += (tx - CAMV.ax)*ka; CAMV.ay += (ty - CAMV.ay)*ka;
}
function alvoCamera(hw, hh, F){                        // para onde a câmera quer ir (antes da proteção e da mola)
  const e = cam.estilo;
  if (e === 'bola') return {x:VIS.bx, y:VIS.by};
  if (e === 'tv'){                                     // Transmissão: corre de lado com a bola e quase não sobe nem desce
    const folga = Math.max(0, hh - R_BOLA*4);
    let y = CY + (VIS.by - CY)*.4; y = Math.max(VIS.by - folga, Math.min(VIS.by + folga, y));
    return {x:VIS.bx*.88 + F.x*.12, y};
  }
  if (e === 'frente') return {x:F.x + CAMV.ax, y:F.y + CAMV.ay};   // À frente: você e o caminho da corrida
  const w = Math.max(0, Math.min(1, cam.desl/DESL_MAX));   // Seguir jogador · Deslocamento: 10 = no meio entre você e a bola (como sempre foi)
  return {x:F.x*(1 - w) + (F.x + VIS.bx)/2*w + CAMV.ax, y:F.y*(1 - w) + (F.y + VIS.by)/2*w + CAMV.ay};
}
function camZoomAuto(dt, z0, F, snap){                 // zoom automático: abre devagar quando você e a bola não cabem; volta com calma
  if (snap || !CAMV.z){ CAMV.z = CAMV.zAlvo = z0; return z0; }
  const A = camLivre(), m = F.r*CAM_FOLGA_CORPO + B.r*3;
  const zFit = Math.min((W - A.L - A.R)/(Math.abs(VIS.bx - F.x) + 2*m), (H - A.T - A.B)/(Math.abs(VIS.by - F.y) + 2*m));
  const alvo = Math.max(z0*.7, Math.min(z0, zFit));
  if (alvo < CAMV.z*.97 || alvo > CAMV.z*1.12 || CAMV.zAlvo > z0) CAMV.zAlvo = alvo;   // (a folga entre abrir e fechar: sem vaivém)
  const abre = CAMV.zAlvo < CAMV.z, k = 1 - Math.exp(-dt/(abre ? .7 : 1.6));
  CAMV.z += (Math.min(z0, CAMV.zAlvo) - CAMV.z)*k;
  return Math.min(z0, CAMV.z);
}
function camMola(c, alvo, v, tau, dt){                 // a mola amortecida (crítica): devolve [posição, velocidade]
  const om = 2/tau, x = om*dt, e = 1/(1 + x + .48*x*x + .235*x*x*x), d = c - alvo, t = (v + om*d)*dt;
  return [alvo + (d + t)*e, (v - om*t)*e];
}
function updateCamera(dt, snap){
  dt = Math.max(0, Math.min(dt, .05));
  const seg = cam.mode === 'seguir', F = camFoco(), e = cam.estilo;
  const protege = seg && F.protege && (e === 'jogador' || e === 'frente');
  let tz = zoomAlvo();
  if (seg && cam.auto && protege) tz = camZoomAuto(dt, tz, F, snap); else { CAMV.z = tz; CAMV.zAlvo = tz; }
  const kz = 1 - Math.exp(-CAM_ZOOM_SUAVE*dt), lim = (editing ? 3 : CAM_ZOOM_VEL_MAX)*dt, dz = (tz - cam.z)*kz;   // v27: no editor o zoom responde depressa ao deslizante
  cam.z = snap ? tz : cam.z + Math.max(-lim, Math.min(lim, dz));
  const z = cam.z, hw = W/(2*z), hh = H/(2*z);
  camCorrida(dt, F, snap, hw, hh);
  let alvo = seg ? alvoCamera(hw, hh, F) : {x:CX, y:CY};
  if (protege) alvo = camProtege(alvo.x, alvo.y, F, hw, hh, z);
  if (X49?.camera === 'stable' && !snap && seg){       // Câmera firme: tremidas pequenas do alvo não mexem a câmera
    const m = 8/z; alvo.x -= Math.max(-m, Math.min(m, alvo.x - cam.x)); alvo.y -= Math.max(-m, Math.min(m, alvo.y - cam.y));
  }
  const mx = c => 2*hw >= MW ? MW/2 : Math.max(hw, Math.min(MW - hw, c)), my = c => 2*hh >= MH ? MH/2 : Math.max(hh, Math.min(MH - hh, c));
  alvo.x = mx(alvo.x); alvo.y = my(alvo.y);            // o alvo já respeita a beira do mundo: a mola freia antes (sem a parada seca na beira)
  if (snap || !seg){
    if (snap){ cam.x = alvo.x; cam.y = alvo.y; CAMV.vx = CAMV.vy = 0; }
    else { const k = 1 - Math.exp(-6*dt); cam.x += (alvo.x - cam.x)*k; cam.y += (alvo.y - cam.y)*k; CAMV.vx = CAMV.vy = 0; }
  } else {
    const tau = (CAM_MOLA[e] || .24) + (X49?.camera === 'stable' ? .05 : 0);
    [cam.x, CAMV.vx] = camMola(cam.x, alvo.x, CAMV.vx, tau, dt);
    [cam.y, CAMV.vy] = camMola(cam.y, alvo.y, CAMV.vy, tau, dt);
    if (protege){ const p = camProtege(cam.x, cam.y, F, hw, hh, z); if (p.x !== cam.x) CAMV.vx = 0; if (p.y !== cam.y) CAMV.vy = 0; cam.x = p.x; cam.y = p.y; }   // a garantia: nem a mola deixa você sair da área livre
  }
  // v20: a câmera não mostra fora do mundo; se o mundo é menor que a tela naquele eixo, fica centralizada
  const cx = mx(cam.x), cy = my(cam.y); if (cx !== cam.x) CAMV.vx = 0; if (cy !== cam.y) CAMV.vy = 0; cam.x = cx; cam.y = cy;
}"""

FORA_ANTES = r"""function desenhaForaDaTela(g){                         // no espaço da tela (por baixo do placar e dos controles)
  if (!RQ.on || editing || !RQ.jog.length) return;
  const z = cam.z, a = VIS.a == null ? 1 : VIS.a, F = FORA_TELA;
  const um = (x, y, r, cor, bola) => {
    const sx = W/2 + (x - cam.x)*z, sy = H/2 + (y - cam.y)*z, rr = r*z;
    if (sx + rr > 0 && sx - rr < W && sy + rr > 0 && sy - rr < H) return;   // aparece na tela (nem que seja um pedaço)
    const dx = sx - W/2, dy = sy - H/2, k = Math.min((W/2 - F.borda)/Math.max(1e-6, Math.abs(dx)), (H/2 - F.borda)/Math.max(1e-6, Math.abs(dy)));
    marcadorFora(g, W/2 + dx*k, H/2 + dy*k, Math.atan2(dy, dx), cor, bola);
  };
  for (const q of RQ.jog){
    if (q === P) continue;
    um(q.ax + (q.x - q.ax)*a + (q.ex || 0), q.ay + (q.y - q.ay)*a + (q.ey || 0), q.r, rqCor(q.time).base, false);
  }
  um(VIS.bx, VIS.by, B.r, '#f4f4f6', true);
}"""

FORA_DEPOIS = r"""function foraObstaculos(){                             // v70: onde a setinha não pode ficar (px da tela virtual): os controles, a pausa, o placar e o aviso
  const o = [];
  for (const k of ['joy', 'kick', 'power', 'curva', 'finta', 'drible']){
    if (!hud[k] || !controleVisivel(k) || (ctlVis[k] != null && ctlVis[k] < .1)) continue;
    const e = k === 'joy' ? Object.assign(el('joy'), joyCentro()) : el(k); o.push({c:true, x:e.x, y:e.y, r:e.r + 10});
  }
  o.push({c:false, x0:BTN_PAUSA.x - 8, y0:BTN_PAUSA.y - 8, x1:BTN_PAUSA.x + BTN_PAUSA.w + 8, y1:BTN_PAUSA.y + BTN_PAUSA.h + 8});
  o.push({c:false, x0:W/2 - 196, y0:0, x1:W/2 + 196, y1:72});                  // o placar
  if (RQ.aviso.t > 0 || RQ.estado === 'saida') o.push({c:false, x0:W/2 - 340, y0:68, x1:W/2 + 340, y1:114});   // a faixa do aviso
  return o;
}
function foraLivre(x, y, rr, obs){
  for (const b of obs){
    if (b.c){ if (Math.hypot(x - b.x, y - b.y) < b.r + rr) return false; }
    else if (x + rr > b.x0 && x - rr < b.x1 && y + rr > b.y0 && y - rr < b.y1) return false;
  }
  return true;
}
function foraNaBeira(dx, dy, obs, rr){                 // o ponto na beira da tela na direção (dx, dy); se cai num controle, escorrega pela beira até um lugar livre
  const F = FORA_TELA, b = F.borda + rr, x0 = b, y0 = b, x1 = W - b, y1 = H - b, ww = x1 - x0, hh = y1 - y0, per = 2*(ww + hh);
  const k = Math.min((W/2 - b)/Math.max(1e-6, Math.abs(dx)), (H/2 - b)/Math.max(1e-6, Math.abs(dy)));
  const px = W/2 + dx*k, py = H/2 + dy*k;
  const sDe = (x, y) => Math.abs(y - y0) < 1e-3 ? x - x0 : Math.abs(x - x1) < 1e-3 ? ww + (y - y0) : Math.abs(y - y1) < 1e-3 ? ww + hh + (x1 - x) : 2*ww + hh + (y1 - y);
  const ptDe = s => { s = ((s % per) + per) % per; if (s < ww) return [x0 + s, y0]; s -= ww; if (s < hh) return [x1, y0 + s]; s -= hh; if (s < ww) return [x1 - s, y1]; s -= ww; return [x0, y1 - s]; };
  const s0 = sDe(Math.max(x0, Math.min(x1, px)), Math.max(y0, Math.min(y1, py)));
  for (let d = 0; d <= per/2; d += 10){
    for (const sg of d ? [1, -1] : [1]){ const p = ptDe(s0 + sg*d); if (foraLivre(p[0], p[1], rr, obs)) return p; }
  }
  return [px, py];
}
function desenhaForaDaTela(g){                         // no espaço da tela (por baixo do placar e dos controles) · v70: sem ficar embaixo deles
  if (!RQ.on || editing || !RQ.jog.length) return;
  const z = cam.z, a = VIS.a == null ? 1 : VIS.a, F = FORA_TELA, obs = foraObstaculos(), rr = F.r*1.45;
  const fora = (x, y, r) => { const sx = W/2 + (x - cam.x)*z, sy = H/2 + (y - cam.y)*z, k = r*z; return (sx + k > 0 && sx - k < W && sy + k > 0 && sy - k < H) ? null : [sx - W/2, sy - H/2]; };
  const um = (x, y, r, cor, bola) => {
    const d = fora(x, y, r); if (!d) return;            // aparece na tela (nem que seja um pedaço)
    const p = foraNaBeira(d[0], d[1], obs, rr), ang = Math.atan2(y - (cam.y + (p[1] - H/2)/z), x - (cam.x + (p[0] - W/2)/z));
    marcadorFora(g, p[0], p[1], ang, cor, bola);
  };
  const espec = NET49.playing && NET49.localSlot < 0;
  for (const q of RQ.jog){
    if (q === P && !espec) continue;
    um(q.ax + (q.x - q.ax)*a + (q.ex || 0), q.ay + (q.y - q.ay)*a + (q.ey || 0), q.r, rqCor(q.time).base, false);
  }
  um(VIS.bx, VIS.by, B.r, '#f4f4f6', true);
  if (!espec){                                         // v70: você fora da tela (Seguir bola, Transmissão): a sua setinha, maior e com VOCÊ
    const d = fora(VIS.px, VIS.py, P.r);
    if (d){
      const p = foraNaBeira(d[0], d[1], obs, rr*1.35), ang = Math.atan2(VIS.py - (cam.y + (p[1] - H/2)/z), VIS.px - (cam.x + (p[0] - W/2)/z));
      g.save(); g.translate(p[0], p[1]); g.scale(1.3, 1.3); marcadorFora(g, 0, 0, ang, rqCor(P.time).base, false); g.restore();
      const tx = p[0] - Math.cos(ang)*F.r*3.4, ty = p[1] - Math.sin(ang)*F.r*3.4;
      txt(g, 'VOCÊ', Math.max(60, Math.min(W - 60, tx)), Math.max(24, Math.min(H - 24, ty)), 24, '#ffffff', 'rgba(10,10,22,.95)', 6);
    }
  }
}
function desenhaEspecRotulo(g){                        // v70: o espectador vê quem a câmera acompanha (e troca no botão CÂMERA da barra da sala)
  if (!(NET49.playing && NET49.localSlot < 0) || editing) return;
  const q = ESPEC.alvo >= 0 ? RQ.jog[ESPEC.alvo] : null, s = 'CÂMERA: ' + (q ? String(q.nome || 'JOGADOR').toUpperCase() : 'NA BOLA');
  g.save(); g.font = '22px ' + FONT; const w = g.measureText(s).width + 40; rr(g, W/2 - w/2, H - 64, w, 40, 20); g.fillStyle = 'rgba(8,10,28,.72)'; g.fill(); g.restore();
  txt(g, s, W/2, H - 44, 22, '#ffe9a8', 'rgba(5,10,25,.9)', 4);
  if (q){                                              // o anel em volta de quem está sendo acompanhado
    const z = cam.z, sx = W/2 + (q.x - cam.x)*z, sy = H/2 + (q.y - cam.y)*z;
    g.save(); g.lineWidth = 5; g.strokeStyle = '#ffe9a8'; g.setLineDash([14, 10]); g.beginPath(); g.arc(sx, sy, q.r*z + 12, 0, TAU); g.stroke(); g.restore();
  }
}
function especTroca(){                                 // CÂMERA (espectador): a bola → cada jogador → a bola
  const n = RQ.jog.length; ESPEC.alvo = ESPEC.alvo + 1 >= n ? -1 : ESPEC.alvo + 1;
  return ESPEC.alvo >= 0 && RQ.jog[ESPEC.alvo] ? String(RQ.jog[ESPEC.alvo].nome || 'JOGADOR') : 'BOLA';
}"""

SUBS_PHYS = [
  # o replay diz para onde a câmera olha (o replay acompanha a bola; com a Tela parada, fica parado)
  ("  if (RP.lento && !RP.parado) txt(g, 'CÂMERA LENTA', W/2, by - 30, 26, '#ffd23f', 'rgba(10,8,24,.92)', 6);",
   "  if (RP.lento && !RP.parado) txt(g, 'CÂMERA LENTA', W/2, by - 30, 26, '#ffd23f', 'rgba(10,8,24,.92)', 6);\n"
   "  txt(g, cam.mode === 'seguir' ? 'CÂMERA NA BOLA' : 'TELA PARADA', bx0 - 120, by + 6, 22, '#e8e3ff', 'rgba(10,8,24,.92)', 5);   // v70: quem a câmera acompanha no replay"),
]

SUBS = [
  # o objeto da câmera ganha o enquadramento e o zoom automático
  ("const cam = {mode:CAM_MODO_PADRAO, estilo:'jogador', zoom:ZOOM_PADRAO, desl:DESL_MAX, x:CX, y:CY, z:1};",
   "const cam = {mode:CAM_MODO_PADRAO, estilo:'jogador', preset:'equilibrado', auto:false, zoom:ZOOM_PADRAO, desl:DESL_MAX, x:CX, y:CY, z:1};   // v70: preset = Perto, Equilibrado, Campo inteiro ou Personalizado (pers) · auto = zoom automático"),
  ("const zoomAlvo = () => cam.mode === 'seguir' ? Math.max(1, Math.min(ZOOM_MAX, ARC_ZOOM_BASE*(cam.zoom/ZOOM_PADRAO))) : Math.min(W/QUADRO_W, H/QUADRO_H);",
   "const zoomAlvo = () => cam.mode === 'seguir' ? camZoomPreset() : Math.min(W/QUADRO_W, H/QUADRO_H);   // v70: o enquadramento escolhido (o zoom automático só abre a partir daqui)"),
  (CAM_ANTES, CAM_DEPOIS),
  (FORA_ANTES, FORA_DEPOIS),
  # o rótulo do espectador entra no HUD, por cima das setinhas
  ("  desenhaForaDaTela(ctx);                               // v55: as setinhas de quem está fora da tela",
   "  desenhaForaDaTela(ctx); desenhaEspecRotulo(ctx);       // v55: as setinhas de quem está fora da tela · v70: e quem o espectador acompanha"),
  # o espectador da sala online: a câmera acompanha o alvo escolhido (a bola ou um jogador)
  ("function net49Draw(dt){posVisual(1);if(NET49.localSlot<0){VIS.px=B.x;VIS.py=B.y;}updateCamera(dt,false);spinBall(dt);render(dt);}",
   "function net49Draw(dt){posVisual(1);updateCamera(dt,false);spinBall(dt);render(dt);}   /* v70: quem assiste escolhe o alvo da câmera (camFoco) */"),
  # o que fica guardado: o enquadramento e o zoom automático
  ("cam:{mode:cam.mode, estilo:cam.estilo, zoom:cam.zoom, desl:cam.desl}, graf:graf",
   "cam:{mode:cam.mode, estilo:cam.estilo, preset:cam.preset, auto:cam.auto, zoom:cam.zoom, desl:cam.desl}, graf:graf"),
  ("      if (['jogador', 'frente', 'bola', 'tv'].indexOf(o.cam.estilo) >= 0) cam.estilo = o.cam.estilo;   // RACHA rua v67: como a câmera segue\n",
   "      if (['jogador', 'frente', 'bola', 'tv'].indexOf(o.cam.estilo) >= 0) cam.estilo = o.cam.estilo;   // RACHA rua v67: como a câmera segue\n"
   "      cam.preset = CAM_PRESETS.indexOf(o.cam.preset) >= 0 ? o.cam.preset : Math.round(cam.zoom) === ZOOM_PADRAO ? 'equilibrado' : 'pers';   // v70: quem tinha mexido no zoom fica no Personalizado\n"
   "      cam.auto = o.cam.auto === true;\n"),
  ("  cam.mode = o.cam.mode; cam.zoom = o.cam.zoom; cam.desl = o.cam.desl; cam.estilo = o.cam.estilo || 'jogador';",
   "  cam.mode = o.cam.mode; cam.zoom = o.cam.zoom; cam.desl = o.cam.desl; cam.estilo = o.cam.estilo || 'jogador'; cam.preset = o.cam.preset || 'equilibrado'; cam.auto = !!o.cam.auto;"),
  ("  hudPadrao(); cam.mode = CAM_MODO_PADRAO; cam.estilo = 'jogador'; cam.zoom = ZOOM_PADRAO; cam.desl = DESL_MAX;",
   "  hudPadrao(); cam.mode = CAM_MODO_PADRAO; cam.estilo = 'jogador'; cam.preset = 'equilibrado'; cam.auto = false; cam.zoom = ZOOM_PADRAO; cam.desl = DESL_MAX;"),
]
