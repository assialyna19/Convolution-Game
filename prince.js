/* =====================================================
   LE JEUNE PRINCE ELFE (d'après ton image : cheveux blancs, oreilles pointues, grands yeux bleus,
   cape verte brodée d'or, chemise blanche, pantalon brun, bottes à revers clairs)
   Squelette articulé : chaque membre est une pièce dessinée avec un dégradé, la marche est CALCULÉE
   (angles de la hanche et du genou) et le pied le plus bas touche toujours le sol.
   Il garde ses lunettes magiques rondes, qui brillent quand tu les actives (L).
   Il peut s'accroupir (↓ ou S) pour passer sous un buisson ouvert.
   Pour utiliser ton propre dessin à la place : mets assets/heros.png (voir SPRITE dans jeu.js).
   ===================================================== */
const KH = 0.92;                                             // taille du personnage (1 = grand, 0.8 = plus petit)
const ACIER = [[0, '#1a2133'], [0.3, '#4a5670'], [0.62, '#9aa7c0'], [0.85, '#e9eefb'], [1, '#7d8aa8']];
const ACIER_FOND = [[0, '#0d121e'], [0.4, '#2a3246'], [0.75, '#566480'], [1, '#3a455e']];
const OR_METAL = [[0, '#6b4a12'], [0.5, '#d9a73a'], [0.8, '#ffe9a0'], [1, '#a87a20']];
const CUIR = [[0, '#1a0f08'], [0.6, '#4a2f1b'], [1, '#6b4a2e']];
const LAITON = [[0, '#3a2610'], [0.5, '#b8802a'], [0.8, '#ffe9a0'], [1, '#7a5418']];
const VELOURS = [[0, '#070e26'], [0.45, '#16327a'], [0.8, '#3a68c8'], [1, '#1f3f90']];
const PANTALON_P = [[0, '#07080e'], [0.5, '#1c1f2e'], [0.85, '#3a4058'], [1, '#262a3c']];
const BOTTE = [[0, '#120a05'], [0.5, '#3a2414'], [0.85, '#6a4426'], [1, '#4a2e1a']];
const PEAU_P = [[0, '#7a4a36'], [0.5, '#d9a07a'], [0.85, '#f5cfae'], [1, '#c98f6a']];
const CAPE_V = [[0, '#0c2214'], [0.45, '#245238'], [0.8, '#4a8a5c'], [1, '#1c4430']];            // la cape verte
const BLOUSE = [[0, '#7a869c'], [0.5, '#e6edf6'], [0.85, '#ffffff'], [1, '#aab6c8']];            // la chemise blanche
const PANT_B = [[0, '#140e0a'], [0.5, '#46362a'], [0.85, '#7a6654'], [1, '#56463a']];            // le pantalon brun
const BOTTE_B = [[0, '#120a05'], [0.5, '#3e2a1c'], [0.85, '#6e4e32'], [1, '#4e3622']];           // les bottes brunes
const REVERS = [[0, '#8a7a5a'], [0.5, '#d8c8a0'], [1, '#f0e4c4']];                              // les revers clairs des bottes
const PEAU_E = [[0, '#a8745c'], [0.5, '#f2c8b0'], [0.85, '#ffe6d6'], [1, '#d8a890']];            // la peau claire
const CHEVEUX_B = [[0, '#8c9ab4'], [0.5, '#e8eef8'], [1, '#ffffff']];                            // les cheveux blancs

function degrade(x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([p, c]) => g.addColorStop(p, c)); return g;
}
function assombrir(stops, k) {                                // la même palette, plus sombre (pour les pièces à l'arrière)
  return stops.map(([p, c]) => [p, '#' + [1, 3, 5].map(i => Math.round(parseInt(c.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')]);
}
function piece(ax, ay, bx, by, w0, w1, stops) {                // une pièce : tronc de cône de A à B, dégradé vers la lumière
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  let nx = -dy / L, ny = dx / L;
  if (nx * 0.6 - ny * 0.8 < 0) { nx = -nx; ny = -ny; }          // la normale regarde vers la source de lumière
  const mx = (ax + bx) / 2, my = (ay + by) / 2, w = (w0 + w1) / 4;
  ctx.beginPath();
  ctx.moveTo(ax + nx * w0 / 2, ay + ny * w0 / 2); ctx.lineTo(bx + nx * w1 / 2, by + ny * w1 / 2);
  ctx.lineTo(bx - nx * w1 / 2, by - ny * w1 / 2); ctx.lineTo(ax - nx * w0 / 2, ay - ny * w0 / 2); ctx.closePath();
  ctx.fillStyle = degrade(mx - nx * w * 2, my - ny * w * 2, mx + nx * w * 2, my + ny * w * 2, stops); ctx.fill();
  ctx.strokeStyle = 'rgba(8,10,20,0.8)'; ctx.lineWidth = 1.3; ctx.stroke();
}
function poseJambe(p, amp, air, avant, bas) {                  // [angle de la cuisse, flexion du genou]
  if (bas) return avant ? [1.05, 1.95] : [0.8, 1.7];            // accroupi
  if (air) return avant ? [0.85, 1.25] : [-0.3, 0.75];
  return [0.6 * Math.sin(p) * amp + (avant ? 0.04 : -0.04), amp * 0.95 * Math.max(0, Math.cos(p))];
}

function dessinerPrince(sx, sy) {
  const t = performance.now() / 1000, v = Math.max(-1, Math.min(1, heros.vx / VIT_MAX));
  const bas = !!heros.accroupi, air = !heros.auSol, bouge = !air && Math.abs(heros.vx) > 10, amp = bouge ? Math.min(1, Math.abs(v) * 1.1) : 0, ph = heros.marche;
  const L1 = 31, L2 = 30, CHEV = 6;
  const jN = poseJambe(ph, amp, air, true, bas), jF = poseJambe(ph + Math.PI, amp, air, false, bas);
  const dist = j => L1 * Math.cos(j[0]) + L2 * Math.cos(j[0] - j[1]);
  const hy = -(CHEV + Math.max(dist(jN), dist(jF)));            // le pied le plus bas touche toujours le sol
  const lean = 0.12 * v - (air ? 0.06 : 0) + (bas ? 0.38 : 0) + (bouge || bas ? 0 : 0.015 * Math.sin(t * 2));
  const vent = -v * 22 + Math.sin(t * 3) * 2.5 - (air ? 10 : 0);
  const clignote = typeof heros.invulFin === 'number' && heros.invulFin > performance.now() && Math.floor(performance.now() / 90) % 2;
  ctx.save(); if (clignote) ctx.globalAlpha = 0.35;
  ctx.translate(sx, sy); ctx.scale(heros.sens * KH, KH); ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  const jambe = (j, k) => {                                      // pantalon bouffant, botte brune à revers clair
    const a1 = j[0], a2 = j[0] - j[1], kx = L1 * Math.sin(a1), ky = hy + L1 * Math.cos(a1), ax = kx + L2 * Math.sin(a2), ay = ky + L2 * Math.cos(a2);
    const mx = kx + (ax - kx) * 0.62, my = ky + (ay - ky) * 0.62, nx = kx + (ax - kx) * 0.74, ny = ky + (ay - ky) * 0.74;
    piece(0, hy, kx, ky, 19, 15, assombrir(PANT_B, k)); piece(kx, ky, mx, my, 15, 11, assombrir(PANT_B, k));
    piece(mx, my, nx, ny, 13, 13, assombrir(REVERS, k));                                         // le revers clair
    piece(nx, ny, ax, ay, 10, 9, assombrir(BOTTE_B, k));
    const pitch = Math.max(-0.5, Math.min(0.6, -a2 * 0.7));
    piece(ax - 3, ay + 1, ax + 15 * Math.cos(pitch), ay + 1 + 15 * Math.sin(pitch), 11, 6, assombrir(BOTTE_B, k));
  };
  const bras = (ox, oy, a, flex, k) => {                       // manche de chemise bouffante, poignet, main
    const ex = ox + 21 * Math.sin(a), ey = oy + 21 * Math.cos(a), b = a + flex, wx = ex + 19 * Math.sin(b), wy = ey + 19 * Math.cos(b);
    piece(ox, oy, ex, ey, 15, 11, assombrir(BLOUSE, k)); piece(ex, ey, wx, wy, 11, 8, assombrir(BLOUSE, k));
    piece(wx - 3 * Math.sin(b), wy - 3 * Math.cos(b), wx, wy, 9, 9, assombrir(REVERS, k));
    ctx.beginPath(); ctx.arc(wx + 3 * Math.sin(b), wy + 3 * Math.cos(b), 4, 0, Math.PI * 2); ctx.fillStyle = degrade(wx - 4, wy - 4, wx + 4, wy + 4, assombrir(PEAU_E, k)); ctx.fill();
    return [wx, wy];
  };
  const broderie = (x0, y0, x1, y1, n) => {                    // petits motifs dorés le long d'un bord de la cape
    ctx.strokeStyle = 'rgba(240,200,110,0.75)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 1.7); ctx.moveTo(x + 3, y - 3); ctx.quadraticCurveTo(x + 7, y - 6, x + 6, y - 1); ctx.stroke(); }
  };

  // 1. à l'arrière : le capuchon, la cape, le bras éloigné
  ctx.save(); ctx.translate(0, hy); ctx.rotate(lean);
  ctx.beginPath(); ctx.moveTo(-8, -42); ctx.quadraticCurveTo(-16 + vent * 0.2, -36, -14 + vent * 0.25, -22); ctx.quadraticCurveTo(-4, -24, 0, -40); ctx.closePath();   // capuchon rabattu dans le dos
  ctx.fillStyle = degrade(-14, -42, 0, -22, CAPE_V); ctx.fill(); ctx.strokeStyle = 'rgba(5,20,10,0.8)'; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -40); ctx.quadraticCurveTo(-20 + vent * 0.3, -28, -28 + vent, 12 - (air ? 14 : 0));
  ctx.quadraticCurveTo(-32 + vent * 1.1, 34 + Math.sin(t * 4) * 3, -22 + vent, 56 + Math.sin(t * 5) * 3);
  ctx.quadraticCurveTo(-8, 50, 4, 30); ctx.quadraticCurveTo(0, -4, 2, -38); ctx.closePath();
  ctx.fillStyle = degrade(-34, 0, 6, 0, CAPE_V); ctx.fill(); ctx.strokeStyle = 'rgba(5,20,10,0.8)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 - i * 3, -34); ctx.quadraticCurveTo(-14 + vent * (0.3 + i * 0.2), 10, -14 + vent * (0.6 + i * 0.3) - i * 3, 46); ctx.stroke(); }
  broderie(-6 + vent * 0.05, -34, -22 + vent * 0.95, 50, 7);                                    // broderie dorée au bord de la cape
  bras(-3, -36, -0.1 + 0.55 * Math.sin(ph) * amp - (bas ? 0.4 : 0), 0.45, 0.55);
  ctx.restore();

  jambe(jF, 0.55);                                               // 2. jambe éloignée

  // 3. le torse : chemise blanche, ceinture brune
  ctx.save(); ctx.translate(0, hy); ctx.rotate(lean);
  const bal = -v * 5 + Math.sin(t * 3) * 1.2 - (air ? 4 : 0);
  ctx.beginPath(); ctx.moveTo(-11, 2); ctx.quadraticCurveTo(-14, -18, -12, -34); ctx.quadraticCurveTo(-8, -41, 0, -42);
  ctx.quadraticCurveTo(10, -41, 14, -33); ctx.quadraticCurveTo(17, -16, 12, 2); ctx.quadraticCurveTo(14 + bal * 0.3, 10, 12 + bal, 16); ctx.quadraticCurveTo(0, 19, -12 + bal, 16); ctx.quadraticCurveTo(-13, 9, -11, 2); ctx.closePath();
  ctx.fillStyle = degrade(-14, 0, 17, 0, BLOUSE); ctx.fill(); ctx.strokeStyle = 'rgba(30,36,50,0.7)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(80,90,110,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4, -40); ctx.lineTo(5, -14); ctx.moveTo(-6, -30); ctx.quadraticCurveTo(-8, -18, -6, -8); ctx.stroke();    // plis de la chemise
  ctx.fillStyle = degrade(0, -8, 0, 4, [[0, '#2a1a10'], [0.5, '#5a3e28'], [1, '#7a5a3c']]); ctx.fillRect(-12, -8, 25, 11);                                                       // large ceinture brune
  ctx.fillStyle = degrade(4, -6, 10, 0, OR_METAL); ctx.fillRect(4, -6, 7, 8); ctx.strokeStyle = 'rgba(30,20,5,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(4, -6, 7, 8);
  ctx.restore();

  jambe(jN, 1);                                                  // 4. jambe proche

  // 5. tête, devant de la cape, bras proche (et pistolet à vapeur)
  ctx.save(); ctx.translate(0, hy); ctx.rotate(lean);
  piece(2, -40, 5, -46, 9, 8, PEAU_E);                                                               // cou
  ctx.save(); ctx.translate(5, -56 + (bouge ? Math.sin(ph * 2) * 0.8 : 0));
  const cheveux = degrade(-14, -26, 12, 8, CHEVEUX_B);
  ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(-14, -1); ctx.lineTo(-12, -9); ctx.lineTo(-17, -13); ctx.lineTo(-9, -17); ctx.lineTo(-10, -24); ctx.lineTo(-3, -19); ctx.lineTo(1, -27); ctx.lineTo(6, -19);
  ctx.lineTo(12, -22); ctx.lineTo(12, -12); ctx.lineTo(8, -8); ctx.lineTo(-4, -4); ctx.closePath();                                         // cheveux blancs ébouriffés, derrière
  ctx.fillStyle = cheveux; ctx.fill(); ctx.strokeStyle = 'rgba(110,130,170,0.7)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-14, -9); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fillStyle = degrade(-14, -9, -3, 4, PEAU_E); ctx.fill(); ctx.strokeStyle = 'rgba(100,60,50,0.6)'; ctx.stroke();      // l'oreille pointue
  ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(6, -15, 10, -7); ctx.lineTo(11.5, 1); ctx.lineTo(9.6, 3); ctx.lineTo(10, 5); ctx.quadraticCurveTo(9.4, 10, 4, 12); ctx.quadraticCurveTo(-3, 11, -7, 5); ctx.closePath();
  const vis = ctx.createRadialGradient(6, -3, 1, 2, 2, 17); vis.addColorStop(0, '#fff0e6'); vis.addColorStop(0.55, '#f2cdb8'); vis.addColorStop(1, '#c8967e');
  ctx.fillStyle = vis; ctx.fill(); ctx.strokeStyle = 'rgba(60,40,40,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(230,150,150,0.22)'; ctx.beginPath(); ctx.ellipse(4, 4, 3.8, 2.8, 0, 0, Math.PI * 2); ctx.fill();                  // joue
  ctx.strokeStyle = '#8a96b0'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(2.6, -5.4); ctx.quadraticCurveTo(5.8, -6.8, 9, -5.6); ctx.stroke();       // sourcil clair
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(6.3, -1.4, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();                                              // grand œil bleu clair
  const iris = ctx.createRadialGradient(7, -1.6, 0.3, 7, -1.4, 2.4); iris.addColorStop(0, '#d8f2ff'); iris.addColorStop(0.6, '#7ab8e8'); iris.addColorStop(1, '#4a86c0');
  ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(7, -1.4, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0a1020'; ctx.beginPath(); ctx.arc(7.2, -1.4, 1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6.5, -2.2, 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a4258'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(3.4, -2.6); ctx.quadraticCurveTo(6.4, -5, 9.4, -2.8); ctx.stroke();       // paupière
  ctx.strokeStyle = '#b07a6a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(7, 7.4); ctx.lineTo(9.6, 7); ctx.stroke();                              // bouche
  ctx.strokeStyle = 'rgba(140,90,80,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10.6, 1.6); ctx.lineTo(9.2, 3); ctx.stroke();               // nez
  ctx.globalCompositeOperation = 'lighter';                                                          // les lunettes magiques brillent
  const gl = ctx.createRadialGradient(6.3, -1.4, 0, 6.3, -1.4, 14 + 6 * lunettesAlpha); gl.addColorStop(0, `rgba(127,232,255,${0.22 + 0.55 * lunettesAlpha})`); gl.addColorStop(1, 'rgba(127,232,255,0)');
  ctx.fillStyle = gl; ctx.fillRect(-12, -18, 36, 32); ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath(); ctx.arc(6.3, -1.4, 5.6, 0, Math.PI * 2); ctx.fillStyle = `rgba(150,230,255,${0.2 + 0.35 * lunettesAlpha})`; ctx.fill();
  ctx.strokeStyle = degrade(0, -7, 12, 4, OR_METAL); ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.8, -2); ctx.lineTo(-4, -1); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(6.3, -1.4, 3.9, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
  ctx.fillStyle = cheveux;                                                                            // la frange : des mèches blanches en pointe sur le front
  ctx.beginPath(); ctx.moveTo(-8, -9); ctx.quadraticCurveTo(0, -18, 11, -10); ctx.lineTo(9.6, -5.6); ctx.lineTo(7.4, -9); ctx.lineTo(5, -4.4); ctx.lineTo(2, -9.4); ctx.lineTo(-1, -5.6); ctx.lineTo(-4, -10); ctx.lineTo(-7, -6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(110,130,170,0.7)'; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.strokeStyle = 'rgba(120,140,180,0.45)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 3.2, -17 + (i % 2) * 2); ctx.quadraticCurveTo(-5 + i * 3, -13, -4 + i * 3.1, -9); ctx.stroke(); }
  ctx.restore();
  // devant de la cape : un pan vert drapé sur l'épaule, fermé par un ruban brun
  ctx.beginPath(); ctx.moveTo(-2, -42); ctx.quadraticCurveTo(14, -40, 16 + vent * 0.05, -26); ctx.quadraticCurveTo(8, -6, 2 + bal * 0.2, 2); ctx.quadraticCurveTo(-4, -20, -2, -42); ctx.closePath();
  ctx.fillStyle = degrade(-2, 0, 16, 0, CAPE_V); ctx.fill(); ctx.strokeStyle = 'rgba(5,20,10,0.8)'; ctx.lineWidth = 1.3; ctx.stroke(); broderie(14, -30, 4 + bal * 0.2, 0, 4);
  ctx.fillStyle = '#4a2e1c'; ctx.beginPath(); ctx.moveTo(2, -41); ctx.lineTo(-4, -44); ctx.lineTo(-3, -38); ctx.closePath(); ctx.moveTo(2, -41); ctx.lineTo(8, -44); ctx.lineTo(7, -38); ctx.closePath(); ctx.fill();   // le nœud du ruban

  if (typeof outilActif !== 'undefined' && outilActif === 'vapeur') {                               // le pistolet à vapeur : bras tendu devant lui
    const recul = Math.max(0, 1 - (performance.now() - (heros.tirT || -1e9)) / 180);
    const [gx, gy] = bras(5, -35, 1.5, 0, 1), bx = gx - recul * 6;
    piece(bx - 5, gy - 1, bx + 24, gy - 3, 8, 5, LAITON);
    ctx.beginPath(); ctx.ellipse(bx + 3, gy - 9, 8, 5.5, 0, 0, Math.PI * 2); ctx.fillStyle = degrade(bx - 5, gy - 14, bx + 11, gy - 4, ACIER); ctx.fill();
    ctx.strokeStyle = 'rgba(8,10,20,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
    piece(bx - 2, gy, bx - 5, gy + 11, 5, 4, CUIR);
    if (recul > 0.05) {
      ctx.globalCompositeOperation = 'lighter'; const f = ctx.createRadialGradient(bx + 26, gy - 3, 0, bx + 26, gy - 3, 20);
      f.addColorStop(0, `rgba(210,240,255,${0.8 * recul})`); f.addColorStop(1, 'rgba(210,240,255,0)');
      ctx.fillStyle = f; ctx.fillRect(bx + 6, gy - 23, 40, 40); ctx.globalCompositeOperation = 'source-over';
    }
  }
  bras(4, -36, 0.1 - 0.55 * Math.sin(ph) * amp - (bas ? 0.2 : 0), 0.55, 1);                         // bras proche
  ctx.restore();
  ctx.restore();
}