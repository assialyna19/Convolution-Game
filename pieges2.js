/* =====================================================
   LES TROIS NOUVEAUX FILTRES MAGIQUES et leurs pièges
     • Gaussien  -> la TORNADE   (niveaux 2 et 5)  : on calme les débris sans remplir l'œil de la tornade
     • Netteté   -> le BROUILLARD (niveaux 3 et 5) : on fait ressortir les lanternes cachées qui marquent le pont
     • Contours  -> la PORTE SECRÈTE (niveaux 4 et 5) : on ne garde que les changements brusques, ils dessinent la porte
   Ce sont de vraies convolutions linéaires (voir convolution.js). Chaque piège est une grille de nombres entre 0 et 1.
   Les réglages (graines, seuils) ont été calculés pour que le bon choix de carte soit bien défini :
     tornade : seule la carte moyenne réussit | porte secrète : seule la carte moyenne réussit | brouillard : la moyenne ou la suprême (ou seulement la suprême)
   ===================================================== */
const rngP = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;      // le même hasard que rng() de jeu.js

const COMMUN = { cell: 54, visible: true };
Object.assign(TYPES, {
  tornade: { ...COMMUN, nom: 'Tornade', quoi: 'cette tornade', outil: 'gaussien', vit: 14,
    indice: "Une tornade barre la route ! Mets tes lunettes (touche L) pour voir comment la calmer.",
    mort: "Aïe ! La tornade t'a projeté en arrière. Lunettes (L), Berceuse (4), la bonne carte, puis E !",
    epinesTexte: "Aïe ! La tornade t'envoie valser ! Utilise le Berceuse (4) pour la calmer.",
    succes: "La tornade est calmée : l'œil est libre, tu peux passer !" },
  mur: { ...COMMUN, nom: 'Mur lisse', quoi: 'ce mur', outil: 'contours', vit: 22,
    indice: "Un mur lisse barre la route… Il cache sûrement une porte secrète ! Mets tes lunettes (touche L).",
    mort: "Aïe ! Tu as foncé dans le mur. Lunettes (L), Fusain (6), la bonne carte, puis E !",
    epinesTexte: "Aïe ! Tu as foncé dans le mur ! Utilise le Fusain (6) pour trouver la porte secrète.",
    succes: "Le contour d'une porte secrète apparaît : elle s'ouvre !" },
  brouillard: { ...COMMUN, nom: 'Pont dans le brouillard', quoi: 'ce brouillard', outil: 'nettete', vit: 12,
    indice: "Un brouillard épais cache le pont… Mets tes lunettes (touche L) pour voir comment faire ressortir le chemin.",
    mort: "Plouf ! Tu as quitté le pont invisible. Lunettes (L), Lynx (5), la bonne carte, puis E !",
    succes: "Le brouillard se dissipe : les lanternes et le pont sont visibles !" }
});

/* ---------- La fabrication de chaque grille ---------- */
const FISSURE = (() => { const s = new Set(), cols = 14; for (let y = 1; y < 6; y++) { s.add(y * cols + 5); s.add(y * cols + 8); } for (let x = 5; x <= 8; x++) s.add(1 * cols + x); return s; })();   // les cases de la fissure de la porte
const VARIANTES_BROUILLARD = { A: { per: 4, m: 3, k: 0.4, a: 0.04, seed: 24 }, B: { per: 4, m: 3, k: 0.3, a: 0.04, seed: 50 } };
const NOUVEAUX = {
  tornade: {
    hazard: 'epines',
    creer(d) {
      const cols = 15, rows = 5, c = 54, r = rngP(3239), g = new Array(cols * rows).fill(0);
      for (let y = 0; y < rows; y++) for (let x = 2; x < cols - 2; x++) { if (x >= 6 && x < 9) continue; g[y * cols + x] = r() < 0.5 ? 1 : 0; }     // des débris au hasard, sauf dans l'œil (colonnes 6 à 8)
      return { g, cols, rows, zx: d.x + 2 * c, zl: (cols - 4) * c, y0: SOL_Y - rows * c, zy0: SOL_Y - rows * c, zy1: SOL_Y + 2, info: {} };
    },
    reussi(p, s) {                                         // calmée si les débris sont assez lissés ET si l'œil est resté vide
      const cols = p.cols, corps = []; let oeil = 0;
      for (let y = 0; y < p.rows; y++) for (let x = 2; x < cols - 2; x++) { const v = s[y * cols + x]; if (x >= 6 && x < 9) { if (x === 7) oeil = Math.max(oeil, v); } else corps.push(v); }
      const m = corps.reduce((a, b) => a + b, 0) / corps.length, sd = Math.sqrt(corps.reduce((a, b) => a + (b - m) ** 2, 0) / corps.length);
      return sd <= 0.20 && oeil <= 0.16;
    },
    echec: (p, n) => n < tailleMinimale(p) ? 'trop petite : la tornade reste agitée' : 'trop grande : les débris remplissent l\'œil',
    ok: "✔ La tornade est calmée : l'œil est libre !"
  },
  mur: {
    hazard: 'epines',
    creer(d) {
      const cols = 14, rows = 6, c = 54, r = rngP(74), g = new Array(cols * rows);
      for (let i = 0; i < g.length; i++) { g[i] = 0.5 + (r() - 0.5) * 2 * 0.05; if (FISSURE.has(i)) g[i] -= 0.3; }                                    // un mur un peu rugueux, avec la fine fissure d'une porte
      return { g, cols, rows, zx: d.x + 2 * c, zl: (cols - 4) * c, y0: SOL_Y - rows * c, zy0: SOL_Y - rows * c, zy1: SOL_Y + 2, info: {} };
    },
    reussi(p, s) {                                         // réussi si la fissure ressort ET s'il n'y a presque pas de faux contours
      const cols = p.cols; let vus = 0, faux = 0;
      FISSURE.forEach(i => { if (s[i] > 0.05) vus++; });
      for (let i = 0; i < s.length; i++) {
        const x = i % cols, y = Math.floor(i / cols); let loin = x >= 2 && x < cols - 2 && y < p.rows - 1;
        if (loin) for (const f of FISSURE) if (Math.abs(f % cols - x) <= 1 && Math.abs(Math.floor(f / cols) - y) <= 1) { loin = false; break; }
        if (loin && s[i] > 0.05) faux++;
      }
      return vus / FISSURE.size >= 0.9 && faux <= 2;
    },
    echec: (p, n) => n < tailleMinimale(p) ? 'trop petite : trop de faux contours' : 'trop grande : le contour de la porte a disparu',
    ok: "✔ Le contour d'une porte secrète apparaît !"
  },
  brouillard: {
    hazard: 'chute',
    creer(d) {
      const V = VARIANTES_BROUILLARD[d.variante || 'A'], cols = 16, rows = 3, c = 54, r = rngP(V.seed), pat = [];
      for (let x = 0; x < cols; x++) pat.push(Math.floor(x / (V.per / 2)) % 2 === 0 ? 1 : 0);                                                         // les lanternes (1) et les poteaux sombres (0), en alternance
      const g0 = new Array(cols * rows); for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g0[y * cols + x] = pat[x];
      const fog = balayer(g0, cols, rows, V.m, 'gauss'), g = fog.map(v => 0.5 + V.k * (v - 0.5) + (r() - 0.5) * 2 * V.a);                              // le brouillard : flou + peu de contraste + un peu de grain
      return { g, cols, rows, zx: d.x + 2 * c, zl: (cols - 4) * c, y0: SOL_Y - c, zy0: SOL_Y - c, zy1: H, info: { pat } };
    },
    reussi(p, s) {                                         // réussi si chaque lanterne et chaque poteau ressort franchement (marge d'au moins 0,12)
      let mm = 9; for (let x = 2; x < p.cols - 2; x++) { const v = s[1 * p.cols + x] - 0.5; mm = Math.min(mm, p.info.pat[x] ? v : -v); }
      return mm >= 0.12;
    },
    echec: () => 'trop petite : le brouillard est encore là',
    ok: "✔ Le brouillard se dissipe : le chemin est visible !"
  }
};
function nouveauNouveau(d) {                             // un piège de plus, fabriqué comme les autres (voir nouveauPiege dans pieges.js)
  const N = NOUVEAUX[d.type], T = TYPES[d.type], gen = N.creer(d);
  return { ...d, ...T, g: gen.g, cols: gen.cols, rows: gen.rows, large: 0, epais: 0, tigesIdx: null, tiges: null, art: null, sprites: null, l: gen.cols * T.cell,
           zx: gen.zx, zl: gen.zl, y0: gen.y0, zy0: gen.zy0, zy1: gen.zy1, info: gen.info, numerique: true,
           etat: 'actif', phases: null, anim: null, sortie: null, indice: false, msgT: -1e9, tunnel: false };
}
function majNouveau(p, invul) {                          // les dangers : la tornade et le mur blessent (comme les épines), le brouillard fait tomber (voir surTrou)
  if (NOUVEAUX[p.type].hazard === 'epines' && p.etat !== 'resolu' && heros.x > p.zx - 20 && heros.x < p.zx + p.zl) {
    if (invul) { heros.x = p.zx - 20; heros.vx = Math.min(0, heros.vx); } else epines(p);
  }
}

/* ---------- Les cartes de filtres disponibles dans chaque niveau ---------- */
function majCartesFiltres(niv) {
  const dispo = niv.filtres || ['flou', 'ouverture', 'fermeture'];
  const cartes = [...document.querySelectorAll('#col-d .outil[data-outil]')].filter(b => b.dataset.outil !== 'lunettes');
  cartes.forEach(b => { b.hidden = b.dataset.outil === 'vapeur' ? !HUMAINS_ACTIFS : !dispo.includes(b.dataset.outil); });
  document.getElementById('col-d').classList.toggle('dense', cartes.filter(b => !b.hidden).length > 4);      // plus de 4 filtres : cartes plus compactes
}
const filtreDisponible = nom => { const b = document.querySelector(`#col-d .outil[data-outil="${nom}"]`); return !!b && !b.hidden; };

/* ---------- Les couleurs des pixels de ces pièges : des nombres, donc des dégradés (foncé = 0, clair = 1) ---------- */
function couleurPixel(p, v, op) {
  const A = [27, 18, 51], B = op === 'laplace3' ? [255, 170, 120] : [243, 230, 180];
  const k = op === 'laplace3' ? Math.min(1, v / 0.1) : Math.max(0, Math.min(1, v));                   // contours : la force du bord ; sinon la luminosité
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
}
function opAffichee(p, c, r, figee) {                    // l'opération qui a produit la valeur qu'on voit (pour choisir la couleur)
  const ops = FILTRES[p.outil];
  if (figee || p.etat === 'resolu') return ops[ops.length - 1];
  if (p.etat === 'actif') return null;
  const a = p.anim; return c * p.rows + r < a.k ? ops[a.ph] : (a.ph > 0 ? ops[a.ph - 1] : null);
}

/* ---------- Le dessin de chaque obstacle ---------- */
function dessinerTornade(p, sx, t) {
  if (p.etat === 'anim') return dessinerVuePixels(p, sx);
  const c = p.cell, zs = p.zx - camX, zl = p.zl, haut = p.y0, bas = SOL_Y, calme = p.etat === 'resolu' ? 1 : 0, ex0 = sx + 6 * c, ex1 = sx + 9 * c;
  ctx.save(); ctx.beginPath(); ctx.rect(zs - 10, haut - 10, zl + 20, bas - haut + 14); ctx.clip();
  const nuage = ctx.createLinearGradient(0, haut, 0, bas); nuage.addColorStop(0, `rgba(26,20,48,${0.92 - 0.7 * calme})`); nuage.addColorStop(1, `rgba(58,46,60,${0.8 - 0.65 * calme})`);
  ctx.fillStyle = nuage; ctx.fillRect(zs, haut, zl, bas - haut);
  const masses = [[zs, ex0], [ex1, zs + zl]];
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {                          // de larges bandes sombres qui tourbillonnent : le corps de la tornade
    const [m0, m1] = masses[i % 2], y = haut + ((i * 37) % (bas - haut)), dec = Math.sin(t * 0.0035 * (1 - 0.85 * calme) + i * 1.3) * 18;
    ctx.strokeStyle = `rgba(12,8,28,${0.55 - 0.45 * calme})`; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(m0 + 6 + dec, y); ctx.bezierCurveTo((m0 + m1) / 2 - 30, y - 22, (m0 + m1) / 2 + 30, y + 22, m1 - 6 + dec, y); ctx.stroke();
  }
  for (let i = 0; i < 150; i++) {                         // les débris : feuilles, poussière, branches qui tournent très vite (lentement une fois calmée)
    const [m0, m1] = masses[i % 2], cx = (m0 + m1) / 2, amp = (m1 - m0) * 0.46, ph = t * 0.001 * (2.6 - 2.1 * calme) * (0.6 + hasard(i + 3)) + hasard(i + 9) * 6.28;
    const px = cx + Math.cos(ph) * amp, py = haut + ((hasard(i + 5) + t * 0.00028 * (1 - 0.85 * calme)) % 1) * (bas - haut), tail = 4 + hasard(i + 1) * 7;
    ctx.globalAlpha = 0.9 - 0.55 * calme; ctx.fillStyle = ['#8a7a5a', '#5a4a3a', '#c8d8a0', '#e8e0c8', '#6a8a4a'][i % 5];
    ctx.beginPath(); ctx.ellipse(px, py, tail, tail * 0.5, ph * 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {                          // des traits de vent
    const [m0, m1] = masses[i % 2], y = haut + (i * 53 % (bas - haut)), dec = Math.sin(t * 0.004 * (1 - 0.8 * calme) + i) * 10;
    ctx.strokeStyle = `rgba(230,230,255,${0.28 - 0.2 * calme})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m0 + 8 + dec, y); ctx.quadraticCurveTo((m0 + m1) / 2, y - 14, m1 - 8 + dec, y + 8); ctx.stroke();
  }
  const oeil = ctx.createLinearGradient(ex0, 0, ex1, 0); oeil.addColorStop(0, 'rgba(255,245,210,0)'); oeil.addColorStop(0.5, `rgba(255,245,210,${0.16 + 0.1 * Math.sin(t / 500)})`); oeil.addColorStop(1, 'rgba(255,245,210,0)');
  ctx.fillStyle = oeil; ctx.fillRect(ex0, haut, ex1 - ex0, bas - haut);                                        // l'œil de la tornade : un couloir plus calme
  ctx.restore();
}
function dessinerMur(p, sx, t) {
  if (p.etat === 'anim') return dessinerVuePixels(p, sx);
  const c = p.cell, zs = p.zx - camX, zl = p.zl, haut = p.y0, bas = SOL_Y, ouvert = p.etat === 'resolu';
  ctx.save(); ctx.beginPath(); ctx.rect(zs, haut, zl, bas - haut); ctx.clip();
  const fond = ctx.createLinearGradient(0, haut, 0, bas); fond.addColorStop(0, '#8470a8'); fond.addColorStop(1, '#4a3a6c'); ctx.fillStyle = fond; ctx.fillRect(zs, haut, zl, bas - haut);
  ctx.strokeStyle = 'rgba(8,4,20,0.55)'; ctx.lineWidth = 3;
  for (let y = haut, k = 0; y < bas; y += 36, k++) { ctx.beginPath(); ctx.moveTo(zs, y); ctx.lineTo(zs + zl, y); ctx.stroke(); for (let x = zs + (k % 2) * 45; x < zs + zl; x += 90) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 36); ctx.stroke(); } }
  for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(${hasard(i) < 0.5 ? '255,255,255' : '0,0,0'},0.07)`; ctx.fillRect(zs + hasard(i + 1) * zl, haut + hasard(i + 2) * (bas - haut), 5 + hasard(i + 3) * 10, 4); }
  if (ouvert) {                                           // la porte secrète : son contour brille et elle s'ouvre sur une lumière chaude
    const x0 = sx + 5.5 * c, x1 = sx + 8.5 * c, y0 = haut + 1.5 * c;
    const lu = ctx.createLinearGradient(0, y0, 0, bas); lu.addColorStop(0, '#fff0b0'); lu.addColorStop(1, '#ff9a4a'); ctx.fillStyle = lu; ctx.fillRect(x0, y0, x1 - x0, bas - y0);
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,226,140,${0.7 + 0.3 * Math.sin(t / 300)})`; ctx.lineWidth = 8; ctx.strokeRect(x0, y0, x1 - x0, bas - y0 + 4);
    const g2 = ctx.createRadialGradient((x0 + x1) / 2, bas - 40, 4, (x0 + x1) / 2, bas - 40, 200); g2.addColorStop(0, 'rgba(255,226,140,0.5)'); g2.addColorStop(1, 'rgba(255,226,140,0)'); ctx.fillStyle = g2; ctx.fillRect(x0 - 200, y0 - 40, x1 - x0 + 400, bas - y0 + 80);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}
function dessinerBrouillard(p, sx, t) {
  if (p.etat === 'anim') return dessinerVuePixels(p, sx);
  const c = p.cell, zs = p.zx - camX, zl = p.zl, haut = p.y0, resolu = p.etat === 'resolu';
  const gouffre = ctx.createLinearGradient(0, SOL_Y, 0, H); gouffre.addColorStop(0, '#07040f'); gouffre.addColorStop(1, '#241848'); ctx.fillStyle = gouffre; ctx.fillRect(zs, SOL_Y + 4, zl, H - SOL_Y);
  if (resolu) {                                           // le pont et ses lanternes (1) / poteaux sombres (0)
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(zs, SOL_Y, zl, 12); ctx.strokeStyle = '#3a2814'; ctx.lineWidth = 2; for (let x = zs + 27; x < zs + zl; x += 54) { ctx.beginPath(); ctx.moveTo(x, SOL_Y); ctx.lineTo(x, SOL_Y + 12); ctx.stroke(); }
    for (let col = 2; col < p.cols - 2; col++) { const x = sx + (col + 0.5) * c; ctx.fillStyle = '#2a1f14'; ctx.fillRect(x - 3, SOL_Y - 46, 6, 46);
      if (p.info.pat[col]) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(x, SOL_Y - 52, 2, x, SOL_Y - 52, 34); gl.addColorStop(0, 'rgba(255,230,140,0.9)'); gl.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 34, SOL_Y - 86, 68, 68); ctx.restore(); ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.arc(x, SOL_Y - 52, 6, 0, Math.PI * 2); ctx.fill(); } }
  }
  ctx.save(); ctx.beginPath(); ctx.rect(zs - 30, haut - 30, zl + 60, H - haut + 30); ctx.clip();
  for (let i = 0; i < 16; i++) {                          // le brouillard : de gros nuages blancs qui dérivent (presque disparus une fois dissipé)
    const x = zs + ((hasard(i) * zl + t * 0.012 * (0.4 + hasard(i + 4))) % (zl + 160)) - 80, y = haut + hasard(i + 2) * (SOL_Y - haut + 90), r = 70 + hasard(i + 6) * 70;
    const gb = ctx.createRadialGradient(x, y, 4, x, y, r); gb.addColorStop(0, `rgba(235,235,250,${resolu ? 0.07 : 0.62})`); gb.addColorStop(1, 'rgba(235,235,250,0)'); ctx.fillStyle = gb; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}