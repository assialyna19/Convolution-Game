/* =====================================================
   LES DÉCORS (un par niveau) : ambiance gothique sombre, semi-réaliste
   cimetiere  : cimetière brumeux, arbres morts, tombes et croix, herbes sèches orangées
   ruines     : salle en ruine, murs de briques violettes, colonnes, braseros, fenêtres bleues
   vitraux    : salle des vitraux : grandes verrières colorées, disque d'or, colonnes
   caverne    : caverne : arches de roche, stalactites, crânes et bougies, lumière ambrée au loin
   arbre      : ruines et arbre ancien tordu avec son médaillon, ciel orange
   Chaque décor est construit UNE fois par niveau (cache), en couches qui défilent à des vitesses différentes.
   construireDecor(niv) utilise P, H, SOL_Y, rng (jeu.js) et PIEGES (pieges.js, pour garder les zones des pièges libres).
   ===================================================== */
const T2 = Math.PI * 2;
let TERRE = '#5b4632', HERBE = '#2c5a3e';             // couleurs moyennes du sol (changent selon le niveau ; utilisées par les pièges)
const FEUILLES = ['#050f12', '#0a1c1d', '#10302c', '#1a4a3f', '#2b6a58', '#4a8f78'];   // feuillage (aussi utilisé par le buisson)

/* ---------- Outils : hasard, bruit tuilable, couleurs ---------- */
function R(s) { const f = rng(s * 9301 + 49297); f(); f(); return f; }
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function bruit(px, py, cell, periode, seed) {
  const n = periode / cell, gx = Math.floor(px / cell), gy = Math.floor(py / cell), fx = px / cell - gx, fy = py / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), v = (i, j) => hash2(((i % n) + n) % n, j, seed);
  const a = v(gx, gy), b = v(gx + 1, gy), c = v(gx, gy + 1), d = v(gx + 1, gy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(px, py, periode, seed) { return 0.5 * bruit(px, py, 64, periode, seed) + 0.3 * bruit(px, py, 24, periode, seed + 1) + 0.2 * bruit(px, py, 8, periode, seed + 2); }
function fbmLent(px, py, periode, seed) { return 0.6 * bruit(px, py, 192, periode, seed) + 0.3 * bruit(px, py, 96, periode, seed + 1) + 0.1 * bruit(px, py, 48, periode, seed + 2); }
function toile(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const mixC = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));
const rgbC = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function deg(g, x0, y0, x1, y1, stops) { const f = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([p, c]) => f.addColorStop(p, c)); return f; }

/* ---------- Arbres (morts ou feuillus) ---------- */
function feuillage(g, cx, cy, rx, ry, n, tons, r) {
  g.fillStyle = tons[0]; g.beginPath(); g.ellipse(cx, cy, rx * 0.95, ry * 0.95, 0, 0, T2); g.fill();
  for (let i = 0; i < n; i++) {
    const a = r() * T2, d = Math.sqrt(r()), ox = Math.cos(a) * d, oy = Math.sin(a) * d;
    const lum = (ox * 0.55 - oy * 0.75) * 0.5 + 0.5 + (r() - 0.5) * 0.4;
    g.fillStyle = tons[Math.max(0, Math.min(tons.length - 1, Math.floor(lum * tons.length)))];
    g.beginPath(); g.arc(cx + ox * rx, cy + oy * ry, 2.5 + r() * 4.5, 0, T2); g.fill();
  }
}
function tronc(g, x, base, h, w0, r, couleurs) {
  const w1 = w0 * 0.5, sway = (r() - 0.5) * w0 * 1.6, N = 24, gauche = [], droite = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, cx = x + sway * t * t, y = base - h * t, w = (w0 + (w1 - w0) * t) * (1 + 0.55 * Math.pow(1 - t, 6)) / 2;
    gauche.push([cx - w, y]); droite.push([cx + w, y]);
  }
  g.save(); g.beginPath(); g.moveTo(gauche[0][0], gauche[0][1]);
  gauche.forEach(p => g.lineTo(p[0], p[1])); droite.reverse().forEach(p => g.lineTo(p[0], p[1])); g.closePath();
  const c = couleurs || ['#120d0a', '#2f2319', '#554231', '#7a6450'];
  g.fillStyle = deg(g, x - w0, 0, x + w0, 0, [[0, c[0]], [0.45, c[1]], [0.8, c[2]], [1, c[3]]]); g.fill(); g.clip();
  for (let i = 0; i < w0 * 3; i++) {
    const px = x - w0 + r() * w0 * 2 + sway * 0.5, y0 = base - r() * h, len = 20 + r() * 70;
    g.strokeStyle = r() < 0.7 ? 'rgba(5,3,2,0.45)' : 'rgba(170,150,120,0.2)'; g.lineWidth = 0.8 + r() * 1.6;
    g.beginPath(); g.moveTo(px, y0); g.quadraticCurveTo(px + (r() - 0.5) * 4, y0 - len / 2, px + (r() - 0.5) * 6, y0 - len); g.stroke();
  }
  g.restore();
  return sway;
}
function branche(g, x, y, ang, len, w, prof, r, amas, couleur) {
  const n = 8; let px = x, py = y, a = ang;
  g.lineCap = 'round'; g.strokeStyle = couleur || '#2a2018';
  for (let i = 0; i < n; i++) {
    a += (r() - 0.5) * 0.35;
    const nx = px + Math.cos(a) * len / n, ny = py + Math.sin(a) * len / n;
    g.lineWidth = Math.max(1, w * (1 - i / n)); g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke(); px = nx; py = ny;
    if (prof > 0 && (i === 3 || i === 5)) branche(g, px, py, a + (r() < 0.5 ? -0.8 : 0.8), len * 0.55, w * 0.5, prof - 1, r, amas, couleur);
  }
  if (amas) amas.push([px, py]);
}
function arbreMort(g, seed, x, base, h, dx, grosseur = 0.07, couleurs, couleurBranche, tonsF) {   // arbre : tronc tordu, branches qui se divisent ; tonsF = feuilles ou fleurs au bout des rameaux
  const r = R(seed), w0 = h * grosseur, amas = tonsF ? [] : null;
  g.save(); g.translate(dx, 0);
  const sway = tronc(g, x, base, h * 0.62, w0, r, couleurs), nb = 7 + Math.floor(r() * 3);
  for (let i = 0; i < nb; i++) {
    const t = 0.3 + 0.7 * (i / nb), cote = i % 2 ? 1 : -1;
    branche(g, x + sway * t * t, base - h * 0.62 * t, -Math.PI / 2 + cote * (0.5 + r() * 0.9), h * (0.2 + r() * 0.16), w0 * 0.34, 3, r, amas, couleurBranche);
  }
  branche(g, x + sway, base - h * 0.62, -Math.PI / 2 + (r() - 0.5) * 0.5, h * 0.3, w0 * 0.3, 3, r, amas, couleurBranche);
  if (tonsF) amas.forEach(([cx, cy]) => feuillage(g, cx, cy, 20, 14, 22, tonsF, r));
  g.restore();
}
function racines(g, x, base, w0, dx, couleur) {            // des racines épaisses qui s'étalent au pied d'un gros tronc
  g.save(); g.translate(dx, 0); g.strokeStyle = couleur; g.lineCap = 'round';
  [-2, -1, 1, 2].forEach(k => { g.lineWidth = w0 * 0.2; g.beginPath(); g.moveTo(x + k * w0 * 0.22, base - w0 * 0.7); g.quadraticCurveTo(x + k * w0 * 0.55, base - 6, x + k * (w0 * 0.95 + 26), base + 5); g.stroke(); });
  g.restore();
}

/* ---------- Pierre : briques, colonnes, arches, vitraux, braseros, crânes, tombes ---------- */
function murBriques(g, x0, y0, w, h, c0, c1, seed) {          // un mur de briques dont la couleur varie avec le bruit (tuilable : briques de 48 px)
  const r = R(seed), bw = 48, bh = 20;
  g.fillStyle = rgbC(mixC(c0, [0, 0, 0], 0.5)); g.fillRect(x0, y0, w, h);
  for (let y = y0, j = 0; y < y0 + h; y += bh, j++) {
    for (let x = x0 - (j % 2) * bw / 2; x < x0 + w; x += bw) {
      const v = 0.15 + fbm(((x % P) + P) % P, y, P, seed) * 1.05 + (r() - 0.5) * 0.22;
      g.fillStyle = rgbC(mixC(c0, c1, v)); g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 1, y + 1, bw - 2, 2);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 1, y + bh - 3, bw - 2, 2);
      if (r() < 0.12) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 4 + r() * 30, y + 4 + r() * 8, 4 + r() * 8, 2); }
    }
  }
}
function pathArche(g, x, base, w, h) {                         // arche gothique pointue
  g.beginPath(); g.moveTo(x - w / 2, base); g.lineTo(x - w / 2, base - h * 0.55);
  g.quadraticCurveTo(x - w / 2, base - h * 0.92, x, base - h); g.quadraticCurveTo(x + w / 2, base - h * 0.92, x + w / 2, base - h * 0.55);
  g.lineTo(x + w / 2, base); g.closePath();
}
function colonne(g, seed, x, base, h, w, dx, casse, pierre) {
  const r = R(seed), haut = base - h, p = pierre || [[0, '#2c2a3a'], [0.35, '#6a6676'], [0.7, '#b9b3a4'], [0.9, '#e8e2d2'], [1, '#8a8478']];
  g.save(); g.translate(dx, 0);
  const fut = deg(g, x - w / 2, 0, x + w / 2, 0, p), cap = deg(g, x - w, 0, x + w, 0, p);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 4, base, w * 0.95, 4, 0, 0, T2); g.fill();
  g.fillStyle = cap; g.fillRect(x - w * 0.8, base - 16, w * 1.6, 16); g.fillRect(x - w * 0.66, base - 28, w * 1.32, 12);       // base
  const sommet = casse ? haut + h * 0.35 : haut + 36;
  g.fillStyle = fut; g.beginPath(); g.moveTo(x - w / 2, base - 28);
  g.lineTo(x - w / 2 + 2, sommet);
  if (casse) for (let i = 1; i <= 6; i++) g.lineTo(x - w / 2 + 2 + (w - 4) * i / 6, sommet + (i % 2 ? 14 : -4) + (r() - 0.5) * 8);
  else g.lineTo(x + w / 2 - 2, sommet);
  g.lineTo(x + w / 2, base - 28); g.closePath(); g.fill();
  g.lineWidth = 1;
  for (let i = 1; i < 5; i++) { g.strokeStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.moveTo(x - w / 2 + i * w / 5, base - 28); g.lineTo(x - w / 2 + i * w / 5, sommet + 4); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.moveTo(x - w / 2 + i * w / 5 + 1.5, base - 28); g.lineTo(x - w / 2 + i * w / 5 + 1.5, sommet + 4); g.stroke(); }
  if (!casse) {                                                                       // chapiteau
    g.fillStyle = cap; g.fillRect(x - w * 0.8, haut + 14, w * 1.6, 22); g.fillRect(x - w * 0.95, haut, w * 1.9, 16);
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5;
    [-1, 1].forEach(s => { g.beginPath(); g.arc(x + s * w * 0.62, haut + 26, 6, 0, T2 * 0.8); g.stroke(); });
  }
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
  for (let i = 0; i < 3; i++) { let cx = x - w / 2 + r() * w, cy = sommet + r() * h * 0.5; g.beginPath(); g.moveTo(cx, cy); for (let k = 0; k < 4; k++) { cx += (r() - 0.5) * 6; cy += 8 + r() * 10; g.lineTo(cx, cy); } g.stroke(); }
  if (casse) { g.fillStyle = cap; [[-w * 1.1, 22, 20], [w * 0.7, 14, 12]].forEach(([ox, a, b]) => g.fillRect(x + ox, base - b, a, b)); }   // blocs tombés
  g.restore();
}
function vitrail(g, x, base, w, h, col, dx) {                 // verrière : verre coloré, plombs noirs, lueur
  g.save(); g.translate(dx, 0);
  pathArche(g, x, base, w, h); g.save(); g.clip();
  g.fillStyle = deg(g, 0, base - h, 0, base, [[0, rgbC(mixC(col, [255, 255, 255], 0.25))], [0.5, rgbC(col)], [1, rgbC(mixC(col, [0, 0, 0], 0.55))]]); g.fillRect(x - w, base - h, w * 2, h);
  g.strokeStyle = 'rgba(10,6,10,0.85)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, base - h); g.lineTo(x, base); for (let k = 1; k < 6; k++) { g.moveTo(x - w / 2, base - h * k / 6); g.lineTo(x + w / 2, base - h * k / 6); }
  for (let k = 0; k < 6; k++) { g.moveTo(x - w / 2, base - h * k / 6); g.lineTo(x, base - h * (k + 1) / 6); g.lineTo(x + w / 2, base - h * k / 6); } g.stroke();
  g.fillStyle = rgbC(mixC(col, [255, 255, 255], 0.6), 0.5); g.beginPath(); g.arc(x, base - h * 0.62, w * 0.14, 0, T2); g.fill();
  g.restore(); pathArche(g, x, base, w, h); g.strokeStyle = '#1e1826'; g.lineWidth = 6; g.stroke();
  g.globalCompositeOperation = 'lighter'; const lu = g.createRadialGradient(x, base - h * 0.5, 0, x, base - h * 0.5, h * 0.75);
  lu.addColorStop(0, rgbC(col, 0.3)); lu.addColorStop(1, rgbC(col, 0)); g.fillStyle = lu; g.fillRect(x - h, base - h * 1.3, h * 2, h * 1.6);
  g.restore();
}
function brasero(g, x, base, dx, feux, v) {                    // brasero : la flamme est animée à part (dessinerFeux)
  g.save(); g.translate(dx, 0);
  g.fillStyle = deg(g, x - 9, 0, x + 9, 0, [[0, '#1a1822'], [0.6, '#5a566a'], [1, '#8a8498']]); g.fillRect(x - 9, base - 56, 18, 56); g.fillRect(x - 16, base - 10, 32, 10);
  g.beginPath(); g.moveTo(x - 24, base - 70); g.quadraticCurveTo(x - 20, base - 52, x - 8, base - 52); g.lineTo(x + 8, base - 52); g.quadraticCurveTo(x + 20, base - 52, x + 24, base - 70); g.closePath();
  g.fillStyle = deg(g, x - 24, 0, x + 24, 0, [[0, '#1a120a'], [0.5, '#6a4a28'], [0.85, '#b8802a'], [1, '#5a3a18']]); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#ff8a2a'; g.beginPath(); g.ellipse(x, base - 70, 22, 4, 0, 0, T2); g.fill();
  g.restore();
  feux.push({ x: x + dx, y: base - 70, v });
}
function crane(g, x, base, s, dx) {
  g.save(); g.translate(dx, 0);
  const c = g.createRadialGradient(x - 3 * s, base - 14 * s, 1, x, base - 10 * s, 12 * s); c.addColorStop(0, '#f3ead2'); c.addColorStop(1, '#6a6048');
  g.fillStyle = c; g.beginPath(); g.ellipse(x, base - 10 * s, 10 * s, 9 * s, 0, 0, T2); g.fill(); g.fillRect(x - 6 * s, base - 5 * s, 12 * s, 7 * s);
  g.fillStyle = '#0a0806'; g.beginPath(); g.ellipse(x - 4 * s, base - 11 * s, 2.6 * s, 3 * s, 0, 0, T2); g.ellipse(x + 4 * s, base - 11 * s, 2.6 * s, 3 * s, 0, 0, T2); g.fill();
  g.beginPath(); g.moveTo(x, base - 8 * s); g.lineTo(x - 1.6 * s, base - 5 * s); g.lineTo(x + 1.6 * s, base - 5 * s); g.fill();
  g.strokeStyle = '#0a0806'; g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 2.4 * s, base - 3 * s); g.lineTo(x + i * 2.4 * s, base + 1.5 * s); g.stroke(); }
  g.restore();
}
function tombe(g, seed, x, base, w, h, dx) {
  const r = R(seed); g.save(); g.translate(dx, 0);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 3, base, w * 0.6, 4, 0, 0, T2); g.fill();
  g.beginPath(); g.moveTo(x - w / 2, base); g.lineTo(x - w / 2, base - h * 0.78); g.quadraticCurveTo(x - w / 2, base - h, x, base - h);
  g.quadraticCurveTo(x + w / 2, base - h, x + w / 2, base - h * 0.78); g.lineTo(x + w / 2, base); g.closePath();
  g.fillStyle = deg(g, x - w / 2, 0, x + w / 2, 0, [[0, '#1a2328'], [0.5, '#4a5a5a'], [0.85, '#7d8c88'], [1, '#56645f']]); g.fill();
  g.strokeStyle = 'rgba(5,8,8,0.8)'; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = 'rgba(8,12,12,0.5)'; g.fillRect(x - 2, base - h * 0.85, 4, h * 0.42); g.fillRect(x - w * 0.18, base - h * 0.72, w * 0.36, 4);       // croix gravée
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - 0.5, base - h * 0.85, 1.5, h * 0.42); g.fillRect(x - w * 0.18, base - h * 0.72, w * 0.36, 1.5);
  g.fillStyle = 'rgba(50,110,60,0.4)'; g.beginPath(); g.ellipse(x - w * 0.2, base - 4, w * 0.35, 6, 0, 0, T2); g.ellipse(x + w * 0.3, base - h * 0.7, w * 0.15, h * 0.1, 0, 0, T2); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.beginPath(); let cx = x + w * 0.2, cy = base - h * 0.55; g.moveTo(cx, cy); for (let k = 0; k < 4; k++) { cx += (r() - 0.5) * 8; cy += 8; g.lineTo(cx, cy); } g.stroke();
  g.restore();
}
function croix(g, x, base, h, dx, tilt) {
  g.save(); g.translate(x + dx, base); g.rotate(tilt || 0);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(3, 0, h * 0.2, 3, 0, 0, T2); g.fill();
  const p = deg(g, -6, 0, 6, 0, [[0, '#1a2328'], [0.5, '#56666a'], [1, '#8a9a94']]);
  g.fillStyle = p; g.fillRect(-5, -h, 10, h); g.fillRect(-h * 0.28, -h * 0.78, h * 0.56, 9);
  g.strokeStyle = 'rgba(5,8,8,0.7)'; g.lineWidth = 1; g.strokeRect(-5, -h, 10, h); g.strokeRect(-h * 0.28, -h * 0.78, h * 0.56, 9);
  g.restore();
}
function rocheSimple(g, x, base, w, h, seed, dx, c) {
  const r = R(seed); g.save(); g.translate(dx, 0);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 3, base, w * 0.55, 3, 0, 0, T2); g.fill();
  g.beginPath(); g.moveTo(x - w / 2, base);
  for (let i = 0; i <= 8; i++) { const a = Math.PI + Math.PI * i / 8; g.lineTo(x + Math.cos(a) * w / 2 * (0.9 + r() * 0.2), base + Math.sin(a) * h * (0.85 + r() * 0.25)); }
  g.lineTo(x + w / 2, base); g.closePath();
  const gr = g.createRadialGradient(x + w * 0.25, base - h * 0.8, 2, x, base - h * 0.3, w * 0.7); gr.addColorStop(0, c[0]); gr.addColorStop(0.5, c[1]); gr.addColorStop(1, c[2]);
  g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(5,7,14,0.7)'; g.lineWidth = 1; g.stroke();
  g.restore();
}
function bougie(g, x, base, dx, feux, v) {
  g.save(); g.translate(dx, 0);
  g.fillStyle = deg(g, x - 4, 0, x + 4, 0, [[0, '#8a7a5a'], [0.6, '#e8dcc0'], [1, '#b8a888']]); g.fillRect(x - 4, base - 16, 8, 16);
  g.fillStyle = 'rgba(230,220,190,0.6)'; g.beginPath(); g.ellipse(x - 3, base - 8, 2, 4, 0, 0, T2); g.fill();
  g.restore(); feux.push({ x: x + dx, y: base - 16, v, petit: true });
}
function stalactites(g, seed, n, hmax, c0, c1) {
  const r = R(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * P, w = 22 + r() * 60, hh = 30 + r() * hmax;
    [-P, 0, P].forEach(dx => {
      g.beginPath(); g.moveTo(x + dx - w / 2, -2); g.lineTo(x + dx - w * 0.12, hh * 0.55); g.lineTo(x + dx + (r() - 0.5) * 6, hh); g.lineTo(x + dx + w * 0.14, hh * 0.5); g.lineTo(x + dx + w / 2, -2); g.closePath();
      g.fillStyle = deg(g, x + dx - w / 2, 0, x + dx + w / 2, 0, [[0, c0], [0.7, c1], [1, c0]]); g.fill();
    });
  }
}

/* ---------- La lune ---------- */
function luneReelle() {
  const c = toile(100, 100), g = c.getContext('2d');
  const gr = g.createRadialGradient(42, 40, 4, 50, 50, 46); gr.addColorStop(0, '#fbfcff'); gr.addColorStop(0.7, '#dfe5f5'); gr.addColorStop(1, '#a7b1cf');
  g.fillStyle = gr; g.beginPath(); g.arc(50, 50, 44, 0, T2); g.fill();
  g.save(); g.beginPath(); g.arc(50, 50, 44, 0, T2); g.clip();
  [[36, 34, 13, 9], [58, 44, 11, 13], [40, 62, 15, 8], [62, 68, 8, 7], [28, 52, 6, 6]].forEach(([x, y, rx, ry]) => {
    const m = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); m.addColorStop(0, 'rgba(120,132,165,0.55)'); m.addColorStop(1, 'rgba(120,132,165,0)');
    g.fillStyle = m; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, T2); g.fill();
  });
  const limb = g.createRadialGradient(50, 50, 28, 50, 50, 46); limb.addColorStop(0, 'rgba(20,30,60,0)'); limb.addColorStop(1, 'rgba(20,30,60,0.35)');
  g.fillStyle = limb; g.fillRect(0, 0, 100, 100); g.restore();
  return c;
}

/* ---------- Le sol (chemin de terre, dalles de pierre ou roche) ---------- */
function construireSol(g, s, r) {
  const hh = H - SOL_Y, img = g.createImageData(P, hh);
  for (let y = 0; y < hh; y++) { const t = y / hh; for (let x = 0; x < P; x++) {
    const n = fbm(x, y * 1.4, P, s.seed), v = 0.62 + (n - 0.5) * 0.9 + (hash2(x, y, 3) - 0.5) * 0.16 - t * 0.35, i = (y * P + x) * 4;
    img.data[i] = s.couleur[0] * v; img.data[i + 1] = s.couleur[1] * v; img.data[i + 2] = s.couleur[2] * v; img.data[i + 3] = 255; } }
  g.putImageData(img, 0, SOL_Y);
  const lu = g.createLinearGradient(0, SOL_Y, 0, SOL_Y + 10); lu.addColorStop(0, rgbC(s.reflet, 0.3)); lu.addColorStop(1, rgbC(s.reflet, 0));
  g.fillStyle = lu; g.fillRect(0, SOL_Y, P, 10);
  if (s.dalles) {                                                                        // joints entre les dalles de pierre
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, SOL_Y + 46); g.lineTo(P, SOL_Y + 46); g.stroke();
    for (let k = 0, x = 20; x < P; k++, x += 110 + hash2(k, 1, 5) * 90) { g.beginPath(); g.moveTo(x, SOL_Y); g.lineTo(x + (hash2(k, 2, 5) - 0.5) * 10, SOL_Y + 46); g.stroke(); g.beginPath(); g.moveTo(x + 60, SOL_Y + 46); g.lineTo(x + 60, H); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.moveTo(0, SOL_Y + 48); g.lineTo(P, SOL_Y + 48); g.stroke();
  }
  for (let i = 0; i < 60; i++) {                                                         // cailloux, éclats
    const x = r() * P, y = SOL_Y + 8 + r() * (hh - 14), w = 3 + r() * 8;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 1.5, y + 1.5, w, w * 0.5, 0, 0, T2); g.fill();
    const f = g.createRadialGradient(x + w * 0.3, y - w * 0.2, 0.5, x, y, w); f.addColorStop(0, rgbC(mixC(s.couleur, [255, 255, 255], 0.35))); f.addColorStop(1, rgbC(mixC(s.couleur, [0, 0, 0], 0.55)));
    g.fillStyle = f; g.beginPath(); g.ellipse(x, y, w, w * 0.55, 0, 0, T2); g.fill();
  }
  g.strokeStyle = 'rgba(10,6,3,0.35)'; g.lineWidth = 1;
  for (let i = 0; i < 16; i++) { let x = r() * P, y = SOL_Y + 10 + r() * 60; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += 6 + r() * 10; y += (r() - 0.5) * 8; g.lineTo(x, y); } g.stroke(); }
}
function herbeSeche(g, r, couleurs, hmax, pas) {               // brins d'herbe courbés
  g.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) for (let x = 0; x < P; x += pas) {
    const h = (pass ? 4 : 7) + r() * (pass ? hmax * 0.6 : hmax), lean = (r() - 0.5) * 12, y0 = SOL_Y + 2 + pass * 3;
    const f = g.createLinearGradient(0, y0, 0, y0 - h); f.addColorStop(0, pass ? '#0a0806' : '#15100a'); f.addColorStop(1, couleurs[Math.floor(r() * couleurs.length)]);
    g.strokeStyle = f; g.lineWidth = 1.2 + r() * 1.2; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + lean * 0.3, y0 - h * 0.6, x + lean, y0 - h); g.stroke();
  }
}

/* ---------- Nouveaux objets : fougères, fleurs lumineuses, roseaux, torches, grilles, vitraux riches, pagodes, planches ---------- */
function fougere(g, x, base, s, seed, dx, c1, c2) {
  const r = R(seed); g.save(); g.translate(dx, 0); g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI / 2 + (i - 3) * 0.34 + (r() - 0.5) * 0.15, L = (26 + r() * 18) * s;
    const ex = x + Math.cos(ang) * L, ey = base + Math.sin(ang) * L * 0.9, cx = x + Math.cos(ang) * L * 0.45, cy = base + Math.sin(ang) * L * 1.05;
    g.strokeStyle = c1; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke();
    for (let k = 1; k < 12; k++) {
      const t = k / 12, u = 1 - t, px = u * u * x + 2 * u * t * cx + t * t * ex, py = u * u * base + 2 * u * t * cy + t * t * ey, l = (8 * (1 - t) + 2) * s;
      g.strokeStyle = px > x ? c2 : c1; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px - l, py + l * 0.5); g.moveTo(px, py); g.lineTo(px + l, py + l * 0.5); g.stroke();
    }
  }
  g.restore();
}
function fleurLum(g, x, base, s, col, dx) {                  // une fleur qui brille (col = [r,g,b])
  g.save(); g.translate(dx, 0);
  g.strokeStyle = '#1a4a30'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + 3 * s, base - 8 * s, x + 1 * s, base - 15 * s); g.stroke();
  g.globalCompositeOperation = 'lighter'; const lu = g.createRadialGradient(x + s, base - 16 * s, 0, x + s, base - 16 * s, 16 * s); lu.addColorStop(0, rgbC(col, 0.55)); lu.addColorStop(1, rgbC(col, 0));
  g.fillStyle = lu; g.fillRect(x - 16 * s, base - 34 * s, 34 * s, 34 * s); g.globalCompositeOperation = 'source-over';
  g.fillStyle = rgbC(mixC(col, [255, 255, 255], 0.25));
  for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(x + s + Math.cos(i * 1.26) * 3 * s, base - 16 * s + Math.sin(i * 1.26) * 3 * s, 2.5 * s, 1.9 * s, i * 1.26, 0, T2); g.fill(); }
  g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(x + s, base - 16 * s, 1.3 * s, 0, T2); g.fill();
  g.restore();
}
function roseau(g, x, base, h, dx) {                         // un roseau : tige + épi brun
  g.save(); g.translate(dx, 0); g.lineCap = 'round';
  g.strokeStyle = '#1a1230'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + 6, base - h * 0.5, x + 2, base - h); g.stroke();
  g.fillStyle = deg(g, x - 4, 0, x + 6, 0, [[0, '#1a0f10'], [0.6, '#4a2a22'], [1, '#7a4a38']]); g.beginPath(); g.ellipse(x + 2, base - h - 10, 4.2, 14, 0.05, 0, T2); g.fill();
  g.strokeStyle = '#120c1c'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x + 2, base - h - 26); g.lineTo(x + 2, base - h - 36); g.stroke();
  g.restore();
}
function torche(g, x, y, dx, feux, v) {                      // une torche accrochée au mur (la flamme est animée à part)
  g.save(); g.translate(dx, 0);
  g.fillStyle = deg(g, x - 4, 0, x + 4, 0, [[0, '#1a1018'], [0.6, '#4a3a30'], [1, '#2a1c18']]); g.fillRect(x - 3, y, 6, 40);
  g.strokeStyle = '#2a2230'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + 30); g.quadraticCurveTo(x - 14, y + 34, x - 14, y + 14); g.stroke();
  g.fillStyle = deg(g, x - 8, 0, x + 8, 0, [[0, '#2a1810'], [0.6, '#7a5a30'], [1, '#3a2418']]); g.beginPath(); g.moveTo(x - 8, y - 6); g.lineTo(x + 8, y - 6); g.lineTo(x + 5, y + 6); g.lineTo(x - 5, y + 6); g.closePath(); g.fill();
  g.restore(); feux.push({ x: x + dx, y: y - 6, v, petit: true });
}
function toileAraignee(g, x, y, r, dx, sens) {                // une toile d'araignée dans un coin
  g.save(); g.translate(x + dx, y); g.scale(sens, 1); g.strokeStyle = 'rgba(220,210,240,0.35)'; g.lineWidth = 1;
  for (let k = 0; k <= 6; k++) { const a = k * Math.PI / 12; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); }
  for (let j = 1; j <= 5; j++) { g.beginPath(); g.arc(0, 0, r * j / 5, 0, Math.PI / 2); g.stroke(); }
  g.restore();
}
function archeBarreaux(g, x, base, w, h, dx) {               // une arche ronde fermée par une grille de fer, dans un mur de pierre
  g.save(); g.translate(dx, 0);
  const rc = w / 2, cy = base - h + rc;
  g.beginPath(); g.moveTo(x - rc, base); g.lineTo(x - rc, cy); g.arc(x, cy, rc, Math.PI, 0); g.lineTo(x + rc, base); g.closePath();
  g.fillStyle = deg(g, 0, base - h, 0, base, [[0, '#0e0a1a'], [1, '#241a3a']]); g.fill();
  g.save(); g.clip(); g.strokeStyle = '#08060e'; g.lineWidth = 4;
  for (let bx = x - rc + 14; bx < x + rc; bx += 22) { g.beginPath(); g.moveTo(bx, base - h); g.lineTo(bx, base); g.stroke(); }
  for (const by of [base - h * 0.78, base - h * 0.5, base - h * 0.22]) { g.beginPath(); g.moveTo(x - rc, by); g.lineTo(x + rc, by); g.stroke(); }
  g.strokeStyle = 'rgba(160,140,200,0.22)'; g.lineWidth = 1.2; for (let bx = x - rc + 12; bx < x + rc; bx += 22) { g.beginPath(); g.moveTo(bx, base - h); g.lineTo(bx, base); g.stroke(); }
  g.restore();
  g.lineWidth = 20; g.strokeStyle = deg(g, x - rc, 0, x + rc, 0, [[0, '#3a2c58'], [0.5, '#8a7aac'], [1, '#4a3c6a']]);          // l'anneau de pierre
  g.beginPath(); g.moveTo(x - rc - 10, base); g.lineTo(x - rc - 10, cy); g.arc(x, cy, rc + 10, Math.PI, 0); g.lineTo(x + rc + 10, base); g.stroke();
  g.strokeStyle = 'rgba(10,6,20,0.55)'; g.lineWidth = 1.5;
  for (let a = Math.PI; a < Math.PI * 2; a += 0.22) { g.beginPath(); g.moveTo(x + Math.cos(a) * (rc), cy + Math.sin(a) * rc); g.lineTo(x + Math.cos(a) * (rc + 20), cy + Math.sin(a) * (rc + 20)); g.stroke(); }
  g.restore();
}
function lancette(g, x, base, w, h, cols, r) {                // une fenêtre étroite à vitrail : mosaïque de verres colorés, plombs noirs
  pathArche(g, x, base, w, h); g.save(); g.clip();
  const lignes = 9, c = 4;
  for (let gy = 0; gy < lignes; gy++) for (let gx = 0; gx < c; gx++) {
    const x0 = x - w / 2 + gx * w / c, y0 = base - h + gy * h / lignes, cw = w / c, ch = h / lignes;
    const c1 = mixC(cols[Math.floor(r() * cols.length)], [255, 255, 255], r() * 0.3), c2 = mixC(cols[Math.floor(r() * cols.length)], [0, 0, 0], r() * 0.25);
    g.fillStyle = rgbC(c1); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + cw, y0); g.lineTo(x0, y0 + ch); g.closePath(); g.fill();
    g.fillStyle = rgbC(c2); g.beginPath(); g.moveTo(x0 + cw, y0); g.lineTo(x0 + cw, y0 + ch); g.lineTo(x0, y0 + ch); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(10,8,14,0.85)'; g.lineWidth = 2;
  g.beginPath(); for (let gy = 0; gy <= lignes; gy++) { g.moveTo(x - w / 2, base - h + gy * h / lignes); g.lineTo(x + w / 2, base - h + gy * h / lignes); }
  for (let gx = 0; gx <= c; gx++) { g.moveTo(x - w / 2 + gx * w / c, base - h); g.lineTo(x - w / 2 + gx * w / c, base); } g.stroke();
  g.restore();
}
function vitrailRiche(g, x, base, w, h, cols, seed, dx) {      // une grande verrière gothique : deux fenêtres + une rosace, comme dans une cathédrale
  const r = R(seed); g.save(); g.translate(dx, 0);
  const lw = w * 0.46, gap = w * 0.08;
  g.fillStyle = '#06060e'; pathArche(g, x, base, w, h); g.fill();
  [-1, 1].forEach(s => lancette(g, x + s * (lw / 2 + gap / 2), base, lw, h * 0.7, cols, r));
  const rcx = x, rcy = base - h * 0.82, rr = w * 0.27;                                                                   // la rosace
  g.save(); g.beginPath(); g.arc(rcx, rcy, rr, 0, T2); g.clip();
  for (let k = 0; k < 12; k++) { const a0 = k * T2 / 12, a1 = (k + 1) * T2 / 12; g.fillStyle = rgbC(mixC(cols[k % cols.length], [255, 255, 255], 0.15 + (k % 3) * 0.1));
    g.beginPath(); g.moveTo(rcx, rcy); g.arc(rcx, rcy, rr, a0, a1); g.closePath(); g.fill(); }
  g.fillStyle = rgbC(mixC(cols[0], [255, 255, 255], 0.6)); g.beginPath(); g.arc(rcx, rcy, rr * 0.3, 0, T2); g.fill(); g.restore();
  g.strokeStyle = 'rgba(10,8,14,0.85)'; g.lineWidth = 2; g.beginPath(); g.arc(rcx, rcy, rr, 0, T2); g.arc(rcx, rcy, rr * 0.55, 0, T2); for (let k = 0; k < 12; k++) { g.moveTo(rcx, rcy); g.lineTo(rcx + Math.cos(k * T2 / 12) * rr, rcy + Math.sin(k * T2 / 12) * rr); } g.stroke();
  pathArche(g, x, base, w, h); g.strokeStyle = '#2a2a3a'; g.lineWidth = 10; g.stroke(); g.strokeStyle = 'rgba(160,170,200,0.3)'; g.lineWidth = 2; g.stroke();
  g.globalCompositeOperation = 'lighter'; const lu = g.createRadialGradient(x, base - h * 0.5, 0, x, base - h * 0.5, h * 0.85); lu.addColorStop(0, rgbC(cols[0], 0.28)); lu.addColorStop(1, rgbC(cols[0], 0));
  g.fillStyle = lu; g.fillRect(x - h, base - h * 1.4, h * 2, h * 1.8); g.restore();
}
function pagode(g, x, base, s, dx, col) {                      // une silhouette de pagode, avec ses fenêtres allumées
  g.save(); g.translate(dx, 0); g.fillStyle = col;
  for (let k = 0; k < 3; k++) {
    const w = (70 - k * 16) * s, y = base - k * 30 * s;
    g.fillRect(x - w * 0.4, y - 26 * s, w * 0.8, 26 * s);
    g.beginPath(); g.moveTo(x - w * 0.8, y - 24 * s); g.quadraticCurveTo(x - w * 0.4, y - 26 * s, x, y - 44 * s); g.quadraticCurveTo(x + w * 0.4, y - 26 * s, x + w * 0.8, y - 24 * s); g.quadraticCurveTo(x, y - 30 * s, x - w * 0.8, y - 24 * s); g.fill();
    g.fillStyle = 'rgba(255,200,110,0.85)'; g.fillRect(x - 5 * s, y - 20 * s, 3 * s, 8 * s); g.fillRect(x + 3 * s, y - 20 * s, 3 * s, 8 * s); g.fillStyle = col;
  }
  g.fillRect(x - 1.5 * s, base - 120 * s, 3 * s, 32 * s);
  g.restore();
}
function portailRuine(g, x, base, dx) {                        // un portail de pierre ruiné, penché dans l'eau
  g.save(); g.translate(x + dx, base); g.rotate(-0.22);
  const p = deg(g, -50, 0, 50, 0, [[0, '#2a2044'], [0.5, '#5a4a80'], [1, '#8a7aa8']]);
  g.fillStyle = p; g.fillRect(-46, -190, 22, 190); g.fillRect(24, -190, 22, 190); g.fillRect(-60, -206, 120, 22);
  g.fillStyle = '#3a2c58'; g.fillRect(-70, -222, 140, 18); g.strokeStyle = 'rgba(10,6,20,0.7)'; g.lineWidth = 2; g.strokeRect(-46, -190, 22, 190); g.strokeRect(24, -190, 22, 190); g.strokeRect(-60, -206, 120, 22);
  g.strokeStyle = 'rgba(200,190,240,0.25)'; g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-35, -160 + k * 32, 5, 0, T2); g.arc(35, -160 + k * 32, 5, 0, T2); g.stroke(); }
  g.restore();
}

/* ---------- Construction d'un décor complet ---------- */
function construireDecor(niv) {
  const th = niv.theme, r = R(11 + th.length * 7), feux = [];
  const zones = PIEGES.map(d => { const p = nouveauPiege(d); return [p.zx - 80, p.zx + p.zl + 80]; });
  const libre = (x, w) => !zones.some(([z0, z1]) => [0, P, 2 * P, 3 * P, 4 * P].some(k => x < z1 - k && x + w > z0 - k));
  const boucle = f => [-P, 0, P].forEach(f);
  const brume = (g, haut, bas, a, col) => {
    g.save(); g.globalCompositeOperation = 'source-atop';
    const f = g.createLinearGradient(0, haut, 0, bas); f.addColorStop(0, rgbC(col, a * 0.4)); f.addColorStop(1, rgbC(col, a));
    g.fillStyle = f; g.fillRect(0, 0, P, H); g.restore();
  };
  const flou = (src, px) => { const c = toile(P, H), m = c.getContext('2d'); if ('filter' in m) m.filter = `blur(${px}px)`; [-P, 0, P].forEach(dx => m.drawImage(src, dx, 0)); return c; };
  const poser = (g, n, largeur, f) => { for (let i = 0; i < n; i++) { const x = 30 + r() * (P - 140), sd = Math.floor(r() * 90000) + 1; if (libre(x - 10, largeur)) boucle(dx => f(x, sd, dx)); } };
  const ciel = toile(P, H), lointain = toile(P, H), milieu = toile(P, H), proche = toile(P, H), sol = toile(P, H), avant = toile(P, H);
  const out = { ciel, sol, avant, feux, lune: null, halo: [190, 210, 255], nuages: false, rayons: false, rayonsCouleur: '170,210,215', brume: [60, 80, 140], particule: '210,255,150', couches: [] };
  let solParam = null, solCustom = null, herbe = null, herbeH = 0, detailsSol = () => {}, avantStyle = 'herbe';
  const etoiles = (g, n, ymax) => { for (let i = 0; i < n; i++) { const x = r() * P, y = r() * r() * ymax, a = 0.3 + r() * 0.7; g.fillStyle = `rgba(215,228,255,${a})`; g.beginPath(); g.arc(x, y, 0.5 + r() * 1.0, 0, T2); g.fill(); } };
  const tonsLoin = ['#041424', '#082a3a', '#0e4a58', '#1a6a72'], tonsMid = ['#06182a', '#0a2c40', '#12505e', '#1f7a78', '#2ea08a'], tonsPres = ['#0a2a30', '#14504a', '#1f7a5a', '#38b068', '#7aeaa0'];

  if (th === 'lucioles') {                                   // LA FORÊT DES LUCIOLES : forêt bleue de nuit, grands troncs, clairière d'herbe lumineuse
    TERRE = '#26402a'; HERBE = '#4cd04a'; out.brume = [20, 90, 120]; out.particule = '255,235,120'; out.rayons = true; out.rayonsCouleur = '120,210,255';
    { const g = ciel.getContext('2d'); g.fillStyle = deg(g, 0, 0, 0, SOL_Y, [[0, '#030a1e'], [0.45, '#0a2a5a'], [0.78, '#126a8a'], [1, '#26a0a0']]); g.fillRect(0, 0, P, H); etoiles(g, 160, 230);
      const f = deg(g, P * 0.5, 0, P * 0.62, SOL_Y, [[0, 'rgba(150,230,255,0.26)'], [1, 'rgba(150,230,255,0)']]); g.fillStyle = f; g.beginPath(); g.moveTo(P * 0.44, 0); g.lineTo(P * 0.56, 0); g.lineTo(P * 0.72, SOL_Y); g.lineTo(P * 0.5, SOL_Y); g.closePath(); g.fill(); }
    { const t = toile(P, H), g = t.getContext('2d');
      for (let i = 0; i < 20; i++) { const x = i * P / 20 + r() * 30, h = 330 + r() * 120, sd = 500 + i; boucle(dx => { tronc(g, x + dx, 430, h, 16, R(sd), ['#050c1c', '#0a1a34', '#10284a', '#1a3a60']); feuillage(g, x + dx, 430 - h * 0.86, 70, 52, 70, tonsLoin, R(sd + 1)); }); }
      brume(g, 120, 440, 0.55, [30, 120, 150]); lointain.getContext('2d').drawImage(flou(t, 2.4), 0, 0); }
    { const t = toile(P, H), g = t.getContext('2d');
      for (let i = 0; i < 9; i++) { const x = i * P / 9 + r() * 40, h = 400 + r() * 80, sd = 600 + i; boucle(dx => { tronc(g, x + dx, 436, h, 36, R(sd), ['#040a16', '#0a1a30', '#12304a', '#1f4a66']); feuillage(g, x + dx - 30, 436 - h * 0.8, 90, 60, 90, tonsMid, R(sd + 1)); feuillage(g, x + dx + 36, 436 - h * 0.7, 70, 46, 70, tonsMid, R(sd + 2)); }); }
      brume(g, 160, 450, 0.38, [30, 120, 150]); milieu.getContext('2d').drawImage(flou(t, 1.4), 0, 0); }
    { const g = proche.getContext('2d');
      for (let i = 0; i < 4; i++) { const x = i * P / 4 + 120 + r() * 140, sd = 700 + i;
        boucle(dx => { tronc(g, x + dx, SOL_Y - 2, 620, 96, R(sd), ['#040a12', '#0e2036', '#1c4658', '#3a8a8a']); racines(g, x, SOL_Y - 2, 96, dx, '#102a3e');
          [[-70, 220], [64, 300], [-50, 380]].forEach(([ox, oy], k) => feuillage(g, x + dx + ox, SOL_Y - oy, 70, 44, 70, tonsPres, R(sd + k + 3))); }); }
      for (let i = 0; i < 22; i++) { const x = r() * P, rx = 26 + r() * 34, sd = 800 + i; boucle(dx => feuillage(g, x + dx, SOL_Y - 8, rx, rx * 0.6, 40, tonsPres, R(sd))); }
      brume(g, 300, 460, 0.1, [30, 120, 150]); }
    solParam = { couleur: [34, 52, 38], reflet: [140, 255, 160], seed: 21 }; herbe = ['#8aff6a', '#5adf5a', '#b8ff7a', '#3fc84a']; herbeH = 30;
    detailsSol = g => { poser(g, 12, 40, (x, sd, dx) => fougere(g, x, SOL_Y, 0.9 + (sd % 5) * 0.12, sd, dx, '#1a5a34', '#3fb86a'));
      poser(g, 34, 12, (x, sd, dx) => fleurLum(g, x, SOL_Y + 3, 0.9 + (sd % 4) * 0.12, [[140, 200, 255], [255, 240, 150], [200, 255, 200]][sd % 3], dx)); };
    out.couches = [{ img: lointain, v: 0.06 }, { img: milieu, v: 0.2 }, { img: proche, v: 0.5 }];
  } else if (th === 'violette') {                           // LA FORÊT ENCHANTÉE : brume violette, troncs tordus qui se rejoignent, fleurs qui brillent
    TERRE = '#3a2a5a'; HERBE = '#8a5ad0'; out.brume = [140, 90, 210]; out.particule = '240,215,255'; out.rayons = true; out.rayonsCouleur = '210,170,255';
    { const g = ciel.getContext('2d'); g.fillStyle = deg(g, 0, 0, 0, SOL_Y, [[0, '#1a0a38'], [0.45, '#4a2a8a'], [0.8, '#9a6ad8'], [1, '#d8b8ff']]); g.fillRect(0, 0, P, H);
      const gl = g.createRadialGradient(P * 0.5, 330, 10, P * 0.5, 330, 520); gl.addColorStop(0, 'rgba(255,230,255,0.55)'); gl.addColorStop(1, 'rgba(255,230,255,0)'); g.fillStyle = gl; g.fillRect(0, 0, P, H); }
    { const t = toile(P, H), g = t.getContext('2d');
      for (let i = 0; i < 16; i++) { const x = i * P / 16 + r() * 40, h = 300 + r() * 120; boucle(dx => arbreMort(g, 1000 + i, x, 430, h, dx, 0.07, ['#3a2a60', '#4a3a78', '#6a5a98', '#8a7ab8'], '#4a3a78', ['#6a4ab8', '#9a7ae0', '#c8a8ff'])); }
      brume(g, 100, 440, 0.7, [190, 150, 255]); lointain.getContext('2d').drawImage(flou(t, 2.2), 0, 0); }
    { const t = toile(P, H), g = t.getContext('2d');
      for (let i = 0; i < 9; i++) { const x = i * P / 9 + r() * 40, h = 380 + r() * 80; boucle(dx => arbreMort(g, 1100 + i, x, 440, h, dx, 0.085, ['#0e0620', '#24143c', '#4a3278', '#7a5ab8'], '#2a1848', ['#3a2a78', '#6a4ab8', '#a888f0'])); }
      brume(g, 150, 450, 0.4, [140, 90, 210]); milieu.getContext('2d').drawImage(flou(t, 1.4), 0, 0); }
    { const g = proche.getContext('2d');
      for (let i = 0; i < 4; i++) { const x = i * P / 4 + 100 + r() * 160, sd = 1200 + i;
        boucle(dx => { tronc(g, x + dx, SOL_Y - 2, 640, 100, R(sd), ['#080414', '#1a0e30', '#3a2468', '#6a4aa8']); racines(g, x, SOL_Y - 2, 100, dx, '#1a0e30');
          [[-60, 230], [70, 330]].forEach(([ox, oy], k) => feuillage(g, x + dx + ox, SOL_Y - oy, 50, 34, 50, ['#1a0e38', '#3a2478', '#6a4ac0', '#a888f0', '#e0c8ff'], R(sd + k + 3))); }); }
      for (let i = 0; i < 20; i++) { const x = r() * P, rx = 26 + r() * 30, sd = 1300 + i; boucle(dx => feuillage(g, x + dx, SOL_Y - 8, rx, rx * 0.6, 40, ['#120a28', '#2a1c58', '#4a38a0', '#7a5ad8', '#b898ff'], R(sd))); }
      brume(g, 300, 460, 0.1, [140, 90, 210]); }
    solParam = { couleur: [44, 28, 70], reflet: [210, 170, 255], seed: 31 }; herbe = ['#6a3ab0', '#9a6ad8', '#c8a0ff', '#8a5ad0']; herbeH = 26;
    detailsSol = g => { poser(g, 36, 12, (x, sd, dx) => fleurLum(g, x, SOL_Y + 3, 1 + (sd % 4) * 0.14, [[255, 150, 220], [255, 255, 255], [190, 150, 255], [255, 200, 240]][sd % 4], dx));
      poser(g, 8, 40, (x, sd, dx) => fougere(g, x, SOL_Y, 0.9 + (sd % 5) * 0.1, sd, dx, '#3a2468', '#8a5ad0')); };
    out.couches = [{ img: lointain, v: 0.06 }, { img: milieu, v: 0.2 }, { img: proche, v: 0.5 }];
  } else if (th === 'marais') {                              // LE MARAIS POURPRE : ciel rose, arbres morts immenses, portail en ruine, ponton de bois sur l'eau
    TERRE = '#4a3a62'; HERBE = '#6a5a88'; out.brume = [160, 120, 190]; out.particule = '255,220,130';
    { const g = ciel.getContext('2d'); g.fillStyle = deg(g, 0, 0, 0, SOL_Y, [[0, '#2a1640'], [0.4, '#6a4a90'], [0.75, '#b890c0'], [1, '#f0c0d0']]); g.fillRect(0, 0, P, H);
      const gl = g.createRadialGradient(P * 0.5, 300, 10, P * 0.5, 300, 420); gl.addColorStop(0, 'rgba(255,225,235,0.75)'); gl.addColorStop(1, 'rgba(255,225,235,0)'); g.fillStyle = gl; g.fillRect(0, 0, P, H);
      for (let i = 0; i < 14; i++) { const y = 60 + r() * 220, x = r() * P, w = 200 + r() * 300; g.fillStyle = 'rgba(70,40,110,0.18)'; g.beginPath(); g.ellipse(x, y, w, 14 + r() * 14, 0, 0, T2); g.fill(); } }
    { const t = toile(P, H), g = t.getContext('2d');
      g.fillStyle = deg(g, 0, 340, 0, 470, [[0, '#4a3478'], [1, '#2a1c50']]); g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= P; x += 4) g.lineTo(x, 400 - 40 * fbmLent(x % P, 20, P, 71)); g.lineTo(P, H); g.fill();
      [[220, 1.1], [620, 0.8], [1000, 1.3], [1400, 0.9], [1760, 1.0]].forEach(([x, sc], i) => boucle(dx => pagode(g, x, 400, sc, dx, '#2a1a48')));
      for (let i = 0; i < 18; i++) { const x = r() * P; boucle(dx => { g.fillStyle = '#2a1a48'; g.fillRect(x + dx, 392 - r() * 0, 18, 22); g.beginPath(); g.moveTo(x + dx - 4, 392); g.lineTo(x + dx + 9, 380); g.lineTo(x + dx + 22, 392); g.fill(); }); }
      brume(g, 200, 440, 0.55, [200, 150, 210]); lointain.getContext('2d').drawImage(flou(t, 2), 0, 0); }
    { const t = toile(P, H), g = t.getContext('2d');
      g.fillStyle = deg(g, 0, 400, 0, 452, [[0, '#a07ac8'], [1, '#4a3a80']]); g.fillRect(0, 400, P, 52);                      // l'eau, qui reflète le ciel rose
      g.fillStyle = 'rgba(255,220,235,0.28)'; for (let i = 0; i < 40; i++) g.fillRect(r() * P, 404 + r() * 44, 20 + r() * 80, 2);
      for (let i = 0; i < 9; i++) { const x = i * P / 9 + r() * 50; boucle(dx => arbreMort(g, 1500 + i, x, 436, 300 + r() * 120, dx, 0.075, ['#1a1230', '#2a2048', '#4a3a78', '#7a6aa8'], '#2a2048')); }
      [[520, 1], [1480, 1]].forEach(([x]) => boucle(dx => portailRuine(g, x, 430, dx)));
      brume(g, 150, 450, 0.35, [180, 130, 200]); milieu.getContext('2d').drawImage(flou(t, 1.2), 0, 0); }
    { const g = proche.getContext('2d');
      for (let i = 0; i < 3; i++) { const x = i * P / 3 + 160 + r() * 200, sd = 1600 + i;
        boucle(dx => { tronc(g, x + dx, SOL_Y - 2, 640, 110, R(sd), ['#0c0818', '#1c1430', '#3a2c60', '#6a5a98']); racines(g, x, SOL_Y - 2, 110, dx, '#1c1430');
          for (let k = 0; k < 6; k++) { const rr = R(sd + 10 + k); branche(g, x + dx + (rr() - 0.5) * 30, SOL_Y - 330 - rr() * 150, -Math.PI / 2 + (k % 2 ? 1 : -1) * (0.5 + rr() * 0.9), 160 + rr() * 90, 18, 3, rr, null, '#2a2048'); } }); }
      brume(g, 300, 460, 0.1, [160, 120, 190]); }
    solCustom = (g, rr) => {                                                                                              // le ponton de bois sur l'eau
      g.fillStyle = deg(g, 0, SOL_Y + 30, 0, H, [[0, '#5a4a98'], [1, '#1a1240']]); g.fillRect(0, SOL_Y + 30, P, H - SOL_Y);
      g.fillStyle = 'rgba(255,215,235,0.25)'; for (let i = 0; i < 40; i++) g.fillRect(rr() * P, SOL_Y + 40 + rr() * 44, 20 + rr() * 90, 2);
      g.fillStyle = deg(g, 0, SOL_Y, 0, SOL_Y + 14, [[0, '#8a7aa8'], [1, '#4a3c70']]); g.fillRect(0, SOL_Y, P, 14);
      g.fillStyle = deg(g, 0, SOL_Y + 14, 0, SOL_Y + 34, [[0, '#2a2048'], [1, '#120c28']]); g.fillRect(0, SOL_Y + 14, P, 20);
      g.strokeStyle = 'rgba(8,4,18,0.8)'; g.lineWidth = 2;
      for (let x = 0, k = 0; x < P; k++, x += 96 + Math.floor(hash2(k, 1, 9) * 70)) { g.beginPath(); g.moveTo(x, SOL_Y); g.lineTo(x, SOL_Y + 34); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 3, SOL_Y + 2, 40, 2); }
      g.strokeStyle = 'rgba(8,4,18,0.8)'; g.beginPath(); g.moveTo(0, SOL_Y + 14); g.lineTo(P, SOL_Y + 14); g.stroke();
      for (let x = 60; x < P; x += 300) { g.fillStyle = deg(g, x - 5, 0, x + 5, 0, [[0, '#1a1230'], [1, '#4a3a70']]); g.fillRect(x - 5, SOL_Y + 34, 10, H - SOL_Y); }
    };
    detailsSol = g => { poser(g, 10, 20, (x, sd, dx) => roseau(g, x, SOL_Y + 4, 50 + (sd % 40), dx)); };
    avantStyle = 'roseaux'; out.couches = [{ img: lointain, v: 0.06 }, { img: milieu, v: 0.2 }, { img: proche, v: 0.5 }];
  } else if (th === 'donjon') {                              // LE DONJON : murs de pierre violette, arches fermées par des grilles, torches, dalles
    TERRE = '#5a4a78'; HERBE = TERRE; out.brume = [90, 60, 130]; out.particule = '255,170,90';
    { const g = ciel.getContext('2d'); g.fillStyle = '#120c20'; g.fillRect(0, 0, P, H); }
    { const g = lointain.getContext('2d');
      murBriques(g, 0, 0, P, 470, [34, 26, 56], [104, 84, 142], 41);
      const nb = 7, pas = P / nb;
      for (let i = 0; i < nb; i++) { const x = pas * i + pas / 2; boucle(dx => archeBarreaux(g, x, 400, 188, 300, dx)); }
      for (let i = 0; i < nb; i++) { const x = pas * i; boucle(dx => { torche(g, x + dx, 250, 0, feux, 0.12);              // un pilier de briques entre deux arches, avec sa torche
        g.fillStyle = deg(g, x + dx - 30, 0, x + dx + 30, 0, [[0, '#4a3a68'], [0.5, '#9a86bc'], [1, '#5a4a7a']]); g.fillRect(x + dx - 30, 130, 60, 270); g.strokeStyle = 'rgba(10,6,20,0.5)'; g.lineWidth = 1.5;
        for (let y = 130; y < 400; y += 30) { g.beginPath(); g.moveTo(x + dx - 30, y); g.lineTo(x + dx + 30, y); g.stroke(); }
        torche(g, x + dx, 250, 0, feux, 0.12); feux.pop(); feux.pop(); feux.push({ x: x + dx, y: 244, v: 0.12, petit: true }); }); }
      const om = g.createLinearGradient(0, 0, 0, 200); om.addColorStop(0, 'rgba(6,3,14,0.92)'); om.addColorStop(1, 'rgba(6,3,14,0)'); g.fillStyle = om; g.fillRect(0, 0, P, 200);
      for (let i = 0; i < 4; i++) { const x = i * P / 4 + 40; boucle(dx => { toileAraignee(g, x, 0, 90, dx, 1); toileAraignee(g, x + 360, 0, 70, dx, -1); }); }
      brume(g, 100, 470, 0.15, [70, 40, 110]); }
    { const g = milieu.getContext('2d');
      for (let i = 0; i < 4; i++) { const x = 140 + i * 480; boucle(dx => { g.fillStyle = deg(g, x + dx - 38, 0, x + dx + 38, 0, [[0, '#120a22'], [0.5, '#3a2c5a'], [1, '#1a1030']]); g.fillRect(x + dx - 38, 60, 76, 390); g.strokeStyle = 'rgba(0,0,10,0.5)'; for (let y = 60; y < 450; y += 36) { g.beginPath(); g.moveTo(x + dx - 38, y); g.lineTo(x + dx + 38, y); g.stroke(); } torche(g, x + dx, 230, 0, feux, 0.3); }); }
      brume(g, 150, 450, 0.18, [70, 40, 110]); }
    { const g = proche.getContext('2d');
      for (let i = 0; i < 2; i++) { const x = 320 + i * 960; boucle(dx => { g.fillStyle = deg(g, x + dx - 56, 0, x + dx + 56, 0, [[0, '#06030e'], [0.5, '#1e1636'], [1, '#0a0618']]); g.fillRect(x + dx - 56, 0, 112, SOL_Y + 20); }); }
      poser(g, 8, 50, (x, sd, dx) => rocheSimple(g, x, SOL_Y - 2, 40 + (sd % 40), 16 + (sd % 16), sd, dx, ['#7a6a98', '#3a2c58', '#120c22'])); }
    solParam = { couleur: [98, 78, 128], reflet: [255, 170, 100], seed: 41, dalles: true };
    detailsSol = g => { poser(g, 6, 30, (x, sd, dx) => crane(g, x, SOL_Y + 3, 1.3, dx)); };
    avantStyle = 'pierre'; out.couches = [{ img: lointain, v: 0.1 }, { img: milieu, v: 0.3 }, { img: proche, v: 0.55 }];
  } else {                                                   // 'cathedrale' : LA CATHÉDRALE DES VITRAUX : cinq verrières colorées, sol brillant qui reflète les couleurs
    TERRE = '#2a2c42'; HERBE = TERRE; out.brume = [50, 40, 90]; out.particule = '200,220,255';
    { const g = ciel.getContext('2d'); g.fillStyle = '#05050d'; g.fillRect(0, 0, P, H); }
    const palettes = [[[230, 80, 110], [255, 140, 60], [150, 70, 210], [250, 220, 90]], [[255, 150, 40], [255, 220, 70], [230, 60, 60], [255, 245, 150]], [[250, 230, 70], [110, 210, 100], [255, 150, 50], [90, 200, 220]],
                      [[70, 120, 255], [60, 210, 230], [150, 90, 230], [200, 230, 255]], [[60, 210, 130], [50, 190, 190], [240, 230, 90], [120, 230, 150]]];
    { const g = lointain.getContext('2d');
      g.fillStyle = deg(g, 0, 0, 0, 470, [[0, '#0a0a16'], [1, '#14142a']]); g.fillRect(0, 0, P, 470);
      for (let i = 0; i < 5; i++) { const x = 192 + i * 384; boucle(dx => vitrailRiche(g, x, 410, 190, 340, palettes[i], 7000 + i, dx)); }
      for (let i = 0; i < 5; i++) { const x = i * 384; boucle(dx => { g.fillStyle = deg(g, x + dx - 24, 0, x + dx + 24, 0, [[0, '#0a0a14'], [0.5, '#2a2a40'], [1, '#12121e']]); g.fillRect(x + dx - 24, 40, 48, 380); g.strokeStyle = 'rgba(140,150,190,0.2)'; g.lineWidth = 1.5; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(x + dx - 24 + k * 16, 40); g.lineTo(x + dx - 24 + k * 16, 420); g.stroke(); } }); }
      const om = g.createLinearGradient(0, 0, 0, 160); om.addColorStop(0, 'rgba(2,2,8,0.92)'); om.addColorStop(1, 'rgba(2,2,8,0)'); g.fillStyle = om; g.fillRect(0, 0, P, 160);
      brume(g, 100, 470, 0.12, [60, 50, 100]); }
    { const g = milieu.getContext('2d');
      for (let i = 0; i < 5; i++) { const x = i * 384; boucle(dx => colonne(g, 8000 + i, x + dx * 0 , 440, 400, 40, dx, false, [[0, '#06060e'], [0.4, '#1c1c2e'], [0.75, '#3a3a52'], [1, '#12121e']])); }
      brume(g, 150, 450, 0.15, [60, 50, 100]); }
    { const g = proche.getContext('2d');
      for (let i = 0; i < 2; i++) { const x = 300 + i * 960; boucle(dx => colonne(g, 8100 + i, x, SOL_Y + 20, 520, 66, dx, false, [[0, '#030308'], [0.5, '#101020'], [0.9, '#242438'], [1, '#0a0a14']])); } }
    solParam = { couleur: [44, 46, 68], reflet: [200, 200, 255], seed: 51, dalles: true };
    detailsSol = g => { for (let i = 0; i < 5; i++) { const x = 192 + i * 384, c = palettes[i][0];                              // le sol brillant reflète les couleurs des vitraux
        boucle(dx => { g.save(); g.globalCompositeOperation = 'lighter'; const f = g.createLinearGradient(0, SOL_Y, 0, H); f.addColorStop(0, rgbC(c, 0.38)); f.addColorStop(1, rgbC(c, 0));
          g.fillStyle = f; g.beginPath(); g.moveTo(x + dx - 60, SOL_Y); g.lineTo(x + dx + 60, SOL_Y); g.lineTo(x + dx + 110, H); g.lineTo(x + dx - 110, H); g.closePath(); g.fill(); g.restore(); }); } };
    avantStyle = 'pierre'; out.couches = [{ img: lointain, v: 0.1 }, { img: milieu, v: 0.3 }, { img: proche, v: 0.55 }];
  }

  // --- le sol (commun) : texte de terre/dalles/ponton, puis ses détails
  { const g = sol.getContext('2d');
    if (solCustom) solCustom(g, r); else construireSol(g, solParam, r);
    detailsSol(g);
    if (herbe) herbeSeche(g, r, herbe, herbeH, 1.5);
  }
  // --- le premier plan (passe devant le héros)
  { const g = avant.getContext('2d'); g.lineCap = 'round';
    if (avantStyle === 'roseaux') { for (let i = 0; i < 16; i++) { const x = r() * P; boucle(dx => roseau(g, x, H + 4, 36 + r() * 50, dx)); } }
    else if (avantStyle === 'pierre') { for (let x = 0; x < P; x += 10) { const h = 4 + r() * 12; g.fillStyle = r() < 0.5 ? '#07040e' : '#120a20'; g.beginPath(); g.moveTo(x, H + 2); g.lineTo(x + 5, H - h); g.lineTo(x + 10, H + 2); g.fill(); } }
    else {
      const cols = th === 'violette' ? ['#14082a', '#2a1650'] : ['#041418', '#0a2a30'];
      for (let x = 0; x < P; x += 3) { const h = 8 + r() * 26, lean = (r() - 0.5) * 14;
        const f = g.createLinearGradient(0, H + 2, 0, H - h); f.addColorStop(0, '#020406'); f.addColorStop(1, r() < 0.3 ? cols[1] : cols[0]);
        g.strokeStyle = f; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x, H + 2); g.quadraticCurveTo(x + lean * 0.3, H - h * 0.6, x + lean, H - h); g.stroke(); } }
  }
  out.nuages = false; out.terre = TERRE; out.herbe = HERBE;
  return out;
}

/* ---------- Flammes animées (braseros, bougies) ---------- */
function dessinerFeux(t) {
  if (!decor.feux.length) return;
  const tt = t / 1000;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  decor.feux.forEach(f => {
    const base = f.x - ((camX * f.v) % P);
    [base - P, base, base + P].forEach(sx => {
      if (sx < -150 || sx > W + 150) return;
      const fl = Math.sin(tt * 9 + f.x) * 3 + Math.sin(tt * 13 + f.x * 0.3) * 2, s = f.petit ? 0.4 : 1;
      const lu = ctx.createRadialGradient(sx, f.y - 20 * s, 0, sx, f.y - 20 * s, 150 * s); lu.addColorStop(0, `rgba(255,150,50,${0.24 + 0.05 * Math.sin(tt * 7 + f.x)})`); lu.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.fillStyle = lu; ctx.fillRect(sx - 150 * s, f.y - 170 * s, 300 * s, 300 * s);
      const fg = ctx.createLinearGradient(0, f.y, 0, f.y - 50 * s); fg.addColorStop(0, 'rgba(255,220,120,0.95)'); fg.addColorStop(0.5, 'rgba(255,130,30,0.8)'); fg.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(sx - 11 * s, f.y); ctx.quadraticCurveTo(sx - 13 * s, f.y - 24 * s, sx + fl * s, f.y - 52 * s - fl * s); ctx.quadraticCurveTo(sx + 13 * s, f.y - 24 * s, sx + 11 * s, f.y); ctx.fill();
    });
  });
  ctx.restore();
}

/* ---------- Rayons de lune (cimetière) ---------- */
function rayonsDeSoleil(t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x0 = ((i * 260 + 60 - camX * 0.05) % (W + 300) + W + 300) % (W + 300) - 150;
    const sway = reduireMouvement ? 0 : Math.sin(t / 2500 + i) * 20, a = 0.04 + (reduireMouvement ? 0 : 0.015 * Math.sin(t / 1800 + i * 2));
    const g = ctx.createLinearGradient(0, 0, 0, SOL_Y);
    g.addColorStop(0, `rgba(${decor.rayonsCouleur},${a * 2})`); g.addColorStop(1, `rgba(${decor.rayonsCouleur},0)`);
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(x0 + sway, 0); ctx.lineTo(x0 + 70 + sway, 0); ctx.lineTo(x0 + 220 + sway, SOL_Y); ctx.lineTo(x0 + 150 + sway, SOL_Y);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}