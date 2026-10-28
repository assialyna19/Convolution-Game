/* =====================================================
   LE MONDE : pièces à ramasser, rochers à sauter, plateformes, trésors cachés
   - Les PIÈCES servent à payer les cartes magiques : petite = 1, moyenne = 2, suprême = 3 (voir COUT_CARTE).
     Plus la carte est grande, plus elle coûte cher : il faut choisir la plus petite qui suffit !
   - Les ROCHERS bloquent la route : il faut sauter par-dessus.
   - Les PLATEFORMES mènent en haut, où des TRÉSORS sont cachés : les lunettes magiques les font briller.
   Tout est fabriqué automatiquement pour chaque niveau (creerMonde) à partir de la place libre entre les pièges.
   ===================================================== */
const COUT_CARTE = { 3: 1, 5: 2, 7: 3 };                // le prix de chaque taille de carte, en pièces
const VALEUR_COFFRE = 5;                                 // un trésor rapporte 5 pièces
let pieces = [], coffres = [], rochers = [], plateformes = [], nbPieces = 0, tresors = 0;
const elPieces = document.getElementById('pieces');

function majPiecesHUD() {
  if (!elPieces) return;
  elPieces.hidden = !!niveauActuel.entrainement;
  elPieces.textContent = `🪙 ${nbPieces}` + (coffres.length ? `  💎 ${tresors}/${coffres.length}` : '');
}
const segmentDe = x => pieges.filter(p => p.zx + p.zl < x).length;                 // le « tronçon » d'une pièce = le nombre de pièges déjà passés
function faireReapparaitre(seg) { pieces.forEach(c => { if (c.seg === seg) c.pris = false; }); }   // si on s'est ruiné, les pièces du tronçon reviennent

function creerMonde(niv) {
  pieces = []; coffres = []; rochers = []; plateformes = []; nbPieces = 0; tresors = 0;
  if (niv.entrainement) { majPiecesHUD(); return; }          // l'entraînement est gratuit et sans saut
  const r = rng(Math.round(niv.longueur) + 11), L = LONGUEUR_NIVEAU;
  const occ = [[0, 460], [L - 760, L]];                       // le départ et la porte restent dégagés
  pieges.forEach(p => occ.push([p.zx - 340, p.zx + p.zl + 220]));      // et on laisse de la place autour des pièges
  occ.sort((a, b) => a[0] - b[0]);
  const libres = []; let cur = 0;
  occ.forEach(([a, b]) => { if (a - cur >= 560) libres.push([cur, a]); cur = Math.max(cur, b); });
  const ajPiece = (x, y) => pieces.push({ x, y, pris: false, ph: r() * 6, seg: segmentDe(x) });
  pieges.forEach(p => { for (let i = 0; i < 5; i++) ajPiece(p.zx - 300 + i * 56, SOL_Y - 30); });      // toujours 5 pièces juste avant chaque piège : on peut toujours payer sa carte
  libres.forEach(([a, b], k) => {
    const len = b - a, bloque = [];
    if (len >= 720) { const rx = Math.round(a + len * 0.22); rochers.push({ x0: rx, x1: rx + 56, top: SOL_Y - 50, graine: r() }); bloque.push([rx - 30, rx + 86]);
      for (let i = 0; i < 5; i++) { const u = i / 4; ajPiece(rx - 74 + u * 204, SOL_Y - 80 - 62 * Math.sin(u * Math.PI)); } }     // un arc de pièces au-dessus : on les attrape en sautant
    if (len >= 1500) { const rx = Math.round(a + len * 0.9 - 56); rochers.push({ x0: rx, x1: rx + 56, top: SOL_Y - 50, graine: r() }); bloque.push([rx - 30, rx + 86]);
      for (let i = 0; i < 5; i++) { const u = i / 4; ajPiece(rx - 74 + u * 204, SOL_Y - 80 - 62 * Math.sin(u * Math.PI)); } }
    if (len >= 900 && (k % 2 === 1 || len >= 1500)) {         // deux plateformes en escalier, et un trésor caché tout en haut
      const cx = Math.round(a + len * 0.55);
      plateformes.push({ x0: cx - 80, x1: cx + 80, top: SOL_Y - 115 }, { x0: cx + 150, x1: cx + 300, top: SOL_Y - 225 });
      coffres.push({ x: cx + 225, top: SOL_Y - 225, ouvert: false, t0: 0 }); bloque.push([cx - 140, cx + 340]);
      [-45, 0, 45].forEach(dx => ajPiece(cx + dx, SOL_Y - 115 - 32));
      [-30, 30].forEach(dx => ajPiece(cx + 225 + dx * 2.2, SOL_Y - 225 - 34));
    }
    for (let x = a + 120; x < b - 160; x += 420 + Math.round(r() * 120)) for (let i = 0; i < 4; i++) {     // des petits groupes de pièces sur la route
      const px = x + i * 54; if (!bloque.some(([p0, p1]) => px > p0 && px < p1)) ajPiece(px, SOL_Y - 30);
    }
  });
  if (!coffres.length && libres.length) {                      // au moins un trésor par niveau, même si la place est comptée
    const [a, b] = libres.reduce((m, s) => (s[1] - s[0] > m[1] - m[0] ? s : m)), cx = Math.round((a + b) / 2) - 150;
    plateformes.push({ x0: cx - 80, x1: cx + 80, top: SOL_Y - 115 }, { x0: cx + 150, x1: cx + 300, top: SOL_Y - 225 }); coffres.push({ x: cx + 225, top: SOL_Y - 225, ouvert: false, t0: 0 });
  }
  majPiecesHUD();
}

/* ---------- La physique : sur quoi le chevalier peut-il se poser ? Et quels rochers le bloquent ? ---------- */
function supportSous(yAvant) {                           // le haut d'un rocher ou d'une plateforme sous les pieds, s'il tombe dessus
  if (heros.vy < 0) return null;
  let best = null;
  const essai = o => { if (heros.x > o.x0 - 8 && heros.x < o.x1 + 8 && yAvant <= o.top + 2 && heros.y >= o.top && (best === null || o.top < best)) best = o.top; };
  plateformes.forEach(essai); rochers.forEach(essai);
  return best;
}
function pousserParRochers(xAvant) {                     // un rocher est un mur : on ne passe qu'en sautant par-dessus
  const demi = 14;
  rochers.forEach(o => {
    if (heros.y > o.top + 4 && heros.x > o.x0 - demi && heros.x < o.x1 + demi) { heros.x = xAvant <= (o.x0 + o.x1) / 2 ? o.x0 - demi : o.x1 + demi; heros.vx = 0; }
  });
}

/* ---------- Ramasser les pièces, ouvrir les trésors ---------- */
function majMonde(dt) {
  if (!pieces.length && !coffres.length) return;
  const cx = heros.x, cy = heros.y - 40;
  pieces.forEach(c => { if (!c.pris && Math.abs(c.x - cx) < 28 && Math.abs(c.y - cy) < 50) { c.pris = true; nbPieces++; Son.jouer('piece'); majPiecesHUD(); } });
  coffres.forEach(k => {
    if (!k.ouvert && Math.abs(k.x - cx) < 36 && heros.y <= k.top + 6 && heros.y >= k.top - 80) {
      k.ouvert = true; k.t0 = performance.now(); nbPieces += VALEUR_COFFRE; tresors++; Son.jouer('coffre'); majPiecesHUD();
      montrerBulle(`💎 Trésor trouvé ! +${VALEUR_COFFRE} pièces (${tresors}/${coffres.length})`);
    }
  });
}

/* ---------- Le dessin ---------- */
function dessinerRocher(o, t) {
  const sx = o.x0 - camX, w = o.x1 - o.x0, h = SOL_Y - o.top;
  if (sx < -80 || sx > W + 80) return;
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(sx + w / 2, SOL_Y + 4, w * 0.62, 6, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(sx, o.top, sx + w, SOL_Y); g.addColorStop(0, '#8a86a8'); g.addColorStop(0.5, '#5b5878'); g.addColorStop(1, '#34324c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - 4, SOL_Y + 2); ctx.lineTo(sx + 2, o.top + h * 0.45); ctx.lineTo(sx + w * 0.25, o.top + 2); ctx.lineTo(sx + w * 0.62, o.top - 3); ctx.lineTo(sx + w - 2, o.top + h * 0.4); ctx.lineTo(sx + w + 5, SOL_Y + 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(15,10,30,0.55)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#4ab07a'; ctx.beginPath(); ctx.moveTo(sx + w * 0.2, o.top + 4); ctx.quadraticCurveTo(sx + w * 0.5, o.top - 10, sx + w * 0.8, o.top + 6); ctx.quadraticCurveTo(sx + w * 0.5, o.top + 12, sx + w * 0.2, o.top + 4); ctx.fill();   // un peu de mousse
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + w * 0.3, o.top + h * 0.3); ctx.lineTo(sx + w * 0.5, o.top + h * 0.55); ctx.stroke();
  ctx.restore();
}
function dessinerPlateforme(pl, t) {
  const sx = pl.x0 - camX, w = pl.x1 - pl.x0;
  if (sx < -w - 40 || sx > W + 40) return;
  ctx.save();
  const g = ctx.createLinearGradient(0, pl.top, 0, pl.top + 26); g.addColorStop(0, '#6a6890'); g.addColorStop(1, '#2b2944');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(sx, pl.top, w, 24, 8); ctx.fill(); ctx.strokeStyle = 'rgba(15,10,30,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#58c487'; ctx.beginPath(); ctx.roundRect(sx - 2, pl.top - 4, w + 4, 8, 4); ctx.fill();                       // le dessus est moussu
  ctx.strokeStyle = '#3f9a6a'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { const vx = sx + 14 + k * (w - 28) / 3; ctx.beginPath(); ctx.moveTo(vx, pl.top + 22); ctx.quadraticCurveTo(vx + 5 * Math.sin(t / 700 + k), pl.top + 34, vx - 2, pl.top + 44); ctx.stroke(); }   // lianes
  ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(sx + w / 2, pl.top + 26, 2, sx + w / 2, pl.top + 26, w * 0.6); gl.addColorStop(0, 'rgba(170,140,255,0.45)'); gl.addColorStop(1, 'rgba(170,140,255,0)');
  ctx.fillStyle = gl; ctx.fillRect(sx - 20, pl.top + 10, w + 40, 60);                                                          // une lueur magique dessous : elle flotte
  ctx.restore();
}
function dessinerCoffre(k, t) {
  const sx = k.x - camX;
  if (sx < -80 || sx > W + 80) return;
  const vis = k.ouvert ? 0.9 : 0.06 + 0.94 * lunettesAlpha, base = k.top, w = 46, h = 30;
  ctx.save();
  if (!k.ouvert) {                                                                  // sans lunettes : seulement une petite étincelle, avec elles : le trésor brille
    const tw = 0.5 + 0.5 * Math.sin(t / 380 + k.x);
    ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(sx, base - 18, 2, sx, base - 18, 20 + 50 * lunettesAlpha); g.addColorStop(0, `rgba(255,225,140,${0.18 + 0.5 * lunettesAlpha * tw})`); g.addColorStop(1, 'rgba(255,225,140,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - 80, base - 100, 160, 120); ctx.globalCompositeOperation = 'source-over';
    if (lunettesAlpha < 0.5) etoile4(sx + 12, base - 30 - 6 * tw, 3 + 3 * tw, 0.35 + 0.5 * tw);
  }
  ctx.globalAlpha = vis;
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(sx - w / 2, base - h, w, h); ctx.fillStyle = '#9a6330'; ctx.fillRect(sx - w / 2, base - h, w, 8);
  ctx.fillStyle = '#f2c14e'; ctx.fillRect(sx - w / 2, base - h * 0.55, w, 4); ctx.fillRect(sx - 4, base - h, 8, h);                  // les bandes d'or
  if (k.ouvert) { ctx.fillStyle = '#ffe9a0'; ctx.fillRect(sx - w / 2 + 3, base - h - 9, w - 6, 9); }
  else { ctx.fillStyle = '#b57a3c'; ctx.beginPath(); ctx.moveTo(sx - w / 2, base - h); ctx.quadraticCurveTo(sx, base - h - 22, sx + w / 2, base - h); ctx.fill(); ctx.fillStyle = '#f2c14e'; ctx.fillRect(sx - 4, base - h - 8, 8, 8); }
  ctx.restore();
  if (k.ouvert) {                                                                                                       // l'éclat quand on l'ouvre : des pièces jaillissent
    const dt = (performance.now() - k.t0) / 1000;
    if (dt < 1.6) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) { const ang = -Math.PI / 2 + (hasard(i + k.x) - 0.5) * 1.9, v = 120 + 120 * hasard(i + 3); etoile4(sx + Math.cos(ang) * v * dt, base - 30 + Math.sin(ang) * v * dt + 260 * dt * dt, 4 + 3 * hasard(i), Math.max(0, 1 - dt / 1.6)); }
      ctx.restore(); }
  }
}
function dessinerPiece(c, t) {
  const sx = c.x - camX;
  if (c.pris || sx < -30 || sx > W + 30) return;
  const larg = 2.5 + 9 * Math.abs(Math.cos(t / 420 + c.ph)), y = c.y + Math.sin(t / 520 + c.ph) * 3;     // la pièce tourne sur elle-même
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(sx, y, 1, sx, y, 18); g.addColorStop(0, 'rgba(255,215,90,0.55)'); g.addColorStop(1, 'rgba(255,215,90,0)'); ctx.fillStyle = g; ctx.fillRect(sx - 18, y - 18, 36, 36); ctx.restore();
  ctx.fillStyle = '#c98b1a'; ctx.beginPath(); ctx.ellipse(sx, y, larg + 1.5, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.ellipse(sx, y, larg, 10.5, 0, 0, Math.PI * 2); ctx.fill();
  if (larg > 6) { ctx.strokeStyle = '#d89a1f'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(sx, y, larg * 0.6, 6.5, 0, 0, Math.PI * 2); ctx.stroke(); }
}
function dessinerMonde(t) {
  plateformes.forEach(pl => dessinerPlateforme(pl, t)); rochers.forEach(o => dessinerRocher(o, t));
  coffres.forEach(k => dessinerCoffre(k, t)); pieces.forEach(c => dessinerPiece(c, t));
}