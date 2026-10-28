/* =====================================================
   ÉTAPE 7 : LES HUMAINS CONTAMINÉS ET LE PISTOLET À VAPEUR
   - un humain contaminé se réveille quand le chevalier s'approche, puis marche vers lui
   - s'il le touche (jauge qui se remplit en 1,5 s), le chevalier perd une vie
   - le chevalier choisit le Pistolet à vapeur (touche 4) et tire avec E : la vapeur contient l'antidote
   - un humain soigné retrouve sa couleur, se redresse et dit merci
   LE LIEN AVEC LA CONVOLUTION : une bulle de spores protège l'humain. Pour la percer, il faut trouver son POINT FAIBLE.
   Avec les lunettes, on voit un scan : une grille où des cases vertes (du bruit) cachent le point faible (un bloc de cases).
   La carte Flou fait glisser la fenêtre sur ce scan et remplace chaque case par la moyenne de ses voisines :
     - la fenêtre doit avoir la taille du point faible : trop petite, le bruit reste ; trop grande, elle étale le point faible.
   Quand le point faible ressort, la vapeur peut le soigner.
   */
let HUMAINS = [];                                        // positions dans le monde (viennent du niveau, voir niveaux.js)
let VIT_HUMAIN = 105, CONTACT_TEMPS = 1.5, SCAN_COEUR = 3, SCAN_BRUIT = 0.12;               // vitesse de marche (px/s, le prince court à 240) et temps de contact avant contamination
let humains = [], vapeurs = [], actionH = false;

const PEAU_MALADE = [[0, '#142014'], [0.5, '#3f5a35'], [0.85, '#8fb060'], [1, '#5f7e48']];
const PEAU_SAINE = [[0, '#4a2e22'], [0.5, '#b9825e'], [0.85, '#f0c09a'], [1, '#c99a76']];
const TISSU_MALADE = [[0, '#120e0a'], [0.5, '#3a2f26'], [0.85, '#6a5848'], [1, '#4a3d30']];
const TISSU_SAIN = [[0, '#0f1a2e'], [0.5, '#2e4a7a'], [0.85, '#5f86c0'], [1, '#3a5a90']];
const PANTALON = [[0, '#0a0a10'], [0.5, '#25252f'], [0.85, '#4a4a5a'], [1, '#32323f']];

const SCAN_W = 16, SCAN_H = 10;
function evalScan(g, n, cx, cy) {                       // applique la convolution (moyenne n×n) au scan et regarde si le point faible ressort
  const s = balayer(g, SCAN_W, SCAN_H, n, 'moyenneNb');
  let pk = 0; for (let i = 0; i < s.length; i++) if (s[i] > s[pk] + 1e-9) pk = i;
  const px = pk % SCAN_W, py = Math.floor(pk / SCAN_W); let autre = 0;
  for (let i = 0; i < s.length; i++) { const x = i % SCAN_W, y = Math.floor(i / SCAN_W); if (Math.max(Math.abs(x - px), Math.abs(y - py)) > n) autre = Math.max(autre, s[i]); }   // la meilleure autre tache
  const marge = s[pk] - autre, proche = Math.abs(px - cx) <= 1 && Math.abs(py - cy) <= 1;
  return { ok: proche && marge >= 0.3, s, pk, marge };                                  // il faut que ce soit LE point faible, et qu'il ressorte nettement
}
function creerScan(graine) {                            // une grille de bruit avec un point faible caché ; on choisit un tirage où SEULE la bonne taille de fenêtre marche
  const half = (SCAN_COEUR - 1) / 2; let g, cx, cy;
  for (let essai = 0; essai < 400; essai++) {
    const r = rng(graine * 131 + essai * 17 + 7);
    cx = half + 1 + Math.floor(r() * (SCAN_W - 2 * half - 2)); cy = half + 1 + Math.floor(r() * (SCAN_H - 2 * half - 2));
    g = Array.from({ length: SCAN_W * SCAN_H }, (_, i) => (Math.abs(i % SCAN_W - cx) <= half && Math.abs(Math.floor(i / SCAN_W) - cy) <= half) ? 1 : (r() < SCAN_BRUIT ? 1 : 0));
    if ([3, 5, 7].every(n => evalScan(g, n, cx, cy).ok === (n === SCAN_COEUR))) break;
  }
  return { g, cx, cy, coeur: SCAN_COEUR, etat: 'bruit', anim: null, s: null, tFin: 0 };
}
function creerHumains() {
  humains = HUMAINS.map((d, i) => ({ x: d.x, x0: d.x, sens: -1, ph: 0, alerte: false, etat: 'malade', cure: 0, meter: 0, tSoin: -1e9, vuln: false, scan: creerScan(i + 1), bouclierT: -1e9, msgT: -1e9 }));
  vapeurs = [];
}

/* ---------- Logique ---------- */
function tirer() {                                       // un nuage de vapeur part de la bouche du pistolet
  heros.tirT = performance.now(); Son.jouer('vapeur');
  vapeurs.push({ x: heros.x + heros.sens * 68, y: heros.y - 92, vx: heros.sens * 520, age: 0 });
}
function humainAScanner() {                             // l'humain malade le plus proche, pas encore démasqué
  const l = humains.filter(q => q.etat === 'malade' && !q.vuln && q.scan.etat !== 'anim' && Math.abs(q.x - heros.x) < 650);
  return l.sort((a, b) => Math.abs(a.x - heros.x) - Math.abs(b.x - heros.x))[0];
}
function lancerScan(h) {                                // la fenêtre glisse sur le scan
  const sc = h.scan, n = tailleFenetre, ev = evalScan(sc.g, n, sc.cx, sc.cy);
  sc.anim = { k: 0, acc: 0, n, ev }; sc.s = ev.s; sc.etat = 'anim';
}
function majScan(h, dt) {
  const sc = h.scan;
  if (sc.etat === 'anim') {
    const a = sc.anim, total = SCAN_W * SCAN_H;
    a.acc += dt * 150; while (a.acc >= 1 && a.k < total) { a.acc -= 1; a.k++; if (a.k % 8 === 0) Son.jouer('tick'); }       // 150 cases par seconde : vite, l'humain approche !
    if (a.k >= total) {
      sc.etat = a.ev.ok ? 'trouve' : 'echec'; sc.tFin = performance.now(); h.vuln = a.ev.ok; Son.jouer(a.ev.ok ? 'succes' : 'echec');
      montrerBulle(a.ev.ok ? "Point faible trouvé ! Choisis la Vapeur (touche 4) et tire avec E." : "Plusieurs taches ressortent : change la taille de ta carte (T) et réessaie.");
      expliquerScan(h, a.n, a.ev.ok);
    }
  } else if (sc.etat === 'echec' && performance.now() - sc.tFin > 3500) sc.etat = 'bruit';
}
function expliquerScan(h, n, ok) {                      // le panneau d'explication : on compare la fenêtre à la taille du point faible
  const c = h.scan.coeur;
  const texte = ok ? `Ta carte (${n}) a la même taille que le point faible (${c}) : elle le fait ressortir au milieu du bruit.`
    : n < c ? `Ta carte (${n}) est plus petite que le point faible (${c}) : les petites taches de bruit ressortent autant que lui.`
            : `Ta carte (${n}) est plus grande que le point faible (${c}) : elle l'étale et il se perd dans le bruit.`;
  elExplication.innerHTML = `<h3>${ok ? '✔ Point faible trouvé !' : '✘ On ne voit pas bien le point faible'}</h3>${ligneEx('Le point faible', c, 'ex-coeur')}${ligneEx('Ta carte', n, 'ex-fen')}<p>${texte}</p>`;
  elExplication.classList.add('visible'); clearTimeout(minuteurExpl); minuteurExpl = setTimeout(cacherExplication, 13000);
}
function absorber(h) {                                  // la vapeur est arrêtée par la bulle de spores
  h.bouclierT = performance.now(); Son.jouer('bloc');
  if (performance.now() - h.msgT > 3000) { h.msgT = performance.now(); montrerBulle("Les spores bloquent la vapeur ! Cherche d'abord son point faible : lunettes (L), Brume (1), puis E."); }
}
function guerir(h) {
  h.etat = 'soigne'; h.meter = 0; h.tSoin = performance.now(); if (typeof Son !== 'undefined') Son.jouer('guerison');
  montrerBulle("Il est guéri ! Merci, chevalier !");
}
function mourirHumain(h) {
  perdreVie();
  heros.vx = 0; heros.vy = 0; heros.y = SOL_Y; heros.auSol = true; heros.tombe = false; heros.enfonce = 0;
  if (vies <= 0) { recommencerNiveau(); return; }       // plus de vies : le niveau recommence
  humains.forEach(x => { if (x.etat === 'malade') { x.x = x.x0; x.alerte = false; x.meter = 0; x.vuln = false; x.scan.etat = 'bruit'; x.scan.anim = null; } });   // les humains reviennent à leur place
  heros.x = Math.max(120, h.x0 - 600);
  montrerBulle("Contaminé ! Choisis le Pistolet à vapeur (touche 4) et tire avec E avant qu'il ne t'atteigne !");
}

function majHumains(dt) {
  const appui = veut('action') && !actionH;              // appui "neuf" sur E
  actionH = veut('action');
  if (appui && outilActif === 'vapeur' && performance.now() - (heros.tirT || -1e9) > 550) tirer();
  if (appui && outilActif === 'flou' && lunettes) { const cible = humainAScanner(); if (cible) lancerScan(cible); }     // le Flou lance le scan sur l'humain le plus proche   // une seconde entre deux tirs, environ
  vapeurs.forEach(v => { v.x += v.vx * dt; v.age += dt; });
  vapeurs = vapeurs.filter(v => {                        // la vapeur touche-t-elle un humain malade ?
    if (v.age > 0.9) return false;
    const rayon = 10 + v.age * 30, h = humains.find(q => q.etat === 'malade' && Math.abs(v.x - q.x) < 30 + rayon);
    if (h) { if (h.vuln) guerir(h); else absorber(h); return false; }          // seul un humain démasqué peut être soigné
    return true;
  });
  humains.forEach(h => {
    if (h.etat === 'soigne') { h.cure = Math.min(1, h.cure + dt * 0.8); return; }
    majScan(h, dt);
    const d = Math.abs(h.x - heros.x);
    if (d < 520 && !h.alerte) { h.alerte = true; Son.jouer('contamine'); }                        // il se réveille quand le chevalier est proche
    if (h.alerte) {
      const dir = Math.sign(heros.x - h.x) || 1; h.sens = dir;
      if (d > 30) { h.x += dir * VIT_HUMAIN * dt; h.ph += VIT_HUMAIN * dt * 0.05; }
    }
    const contact = d < 44 && heros.y > SOL_Y - 70;      // en sautant au-dessus de lui, on évite le contact
    h.meter = Math.max(0, Math.min(1, h.meter + (contact ? dt / CONTACT_TEMPS : -dt)));
    if (h.meter >= 1) mourirHumain(h);
  });
}

/* ---------- Dessin ---------- */
function membreH(ox, oy, a, flex, st, e0, e1) {          // un bras ou une jambe en deux pièces
  const ex = ox + 21 * Math.sin(a), ey = oy + 21 * Math.cos(a), b = a + flex;
  piece(ox, oy, ex, ey, e0, e1, st); piece(ex, ey, ex + 20 * Math.sin(b), ey + 20 * Math.cos(b), e1, e1 - 2, st);
  return [ex + 20 * Math.sin(b), ey + 20 * Math.cos(b)];
}

function dessinerHumain(h, sx, t) {
  const c = h.cure, sy = SOL_Y + 10, K = 0.92, amp = h.etat === 'malade' ? (h.alerte ? 0.8 : 0.12) : 0.08 * (1 - c), ph = h.ph;
  const L1 = 28, L2 = 27, CHEV = 6, lean = 0.3 * (1 - c) + 0.02, brasA = 1.35 * (1 - c) + 0.15 * c;     // courbé et bras tendus quand il est malade
  const pose = p => [0.55 * Math.sin(p) * amp, amp * 0.9 * Math.max(0, Math.cos(p))];
  const jN = pose(ph), jF = pose(ph + Math.PI);
  const bas = j => L1 * Math.cos(j[0]) + L2 * Math.cos(j[0] - j[1]), hy = -(CHEV + Math.max(bas(jN), bas(jF)));
  const jambe = (j, st) => {
    const a1 = j[0], a2 = j[0] - j[1], kx = L1 * Math.sin(a1), ky = hy + L1 * Math.cos(a1), ax = kx + L2 * Math.sin(a2), ay = ky + L2 * Math.cos(a2);
    piece(0, hy, kx, ky, 14, 11, st); piece(kx, ky, ax, ay, 11, 8, st); piece(ax - 2, ay + 1, ax + 12, ay + 3, 9, 6, st);
  };
  const corps = (peau, tissu, sain, alpha) => {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.save(); ctx.translate(0, hy); ctx.rotate(lean);
    membreH(-3, -36, brasA * 0.9 + 0.1 * Math.sin(t * 2 + 1) * (sain ? 0 : 1), 0.3, peau, 8, 7);       // bras éloigné
    ctx.restore();
    jambe(jF, PANTALON);
    ctx.save(); ctx.translate(0, hy); ctx.rotate(lean);
    ctx.beginPath(); ctx.moveTo(-10, 2); ctx.quadraticCurveTo(-13, -18, -10, -34); ctx.quadraticCurveTo(-4, -41, 4, -40);
    ctx.quadraticCurveTo(12, -36, 12, -30); ctx.quadraticCurveTo(15, -14, 11, 4);
    for (let i = 0; i <= 6; i++) ctx.lineTo(11 - i * 3.5, i % 2 ? 11 : 3);                              // bas de la chemise déchiré
    ctx.closePath(); ctx.fillStyle = degrade(-13, 0, 15, 0, tissu); ctx.fill(); ctx.strokeStyle = 'rgba(5,6,10,0.85)'; ctx.lineWidth = 1.3; ctx.stroke();
    if (!sain) { ctx.fillStyle = degrade(-4, 0, 6, 0, peau); [[-2, -22, 5, 6], [3, -12, 4, 5]].forEach(([x, y, w, hh]) => ctx.fillRect(x, y, w, hh)); }   // déchirures : on voit la peau
    ctx.restore();
    jambe(jN, PANTALON);
    ctx.save(); ctx.translate(0, hy); ctx.rotate(lean);
    piece(2, -38, 5, -44, 8, 7, peau);                                                                // cou
    ctx.save(); ctx.translate(5 + 5 * lean * 10 * 0.2, -53);                                          // tête
    const hd = ctx.createRadialGradient(3, -4, 1, 0, 0, 13); hd.addColorStop(0, peau[3][1]); hd.addColorStop(0.6, peau[1][1]); hd.addColorStop(1, peau[0][1]);
    ctx.fillStyle = hd; ctx.beginPath(); ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(5,6,10,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = sain ? '#3a2418' : '#1a1410'; ctx.beginPath(); ctx.moveTo(-10, -2); ctx.quadraticCurveTo(-9, -14, 2, -13); ctx.quadraticCurveTo(10, -12, 10, -4); ctx.quadraticCurveTo(4, -9, -4, -7); ctx.closePath(); ctx.fill();   // cheveux
    if (sain) {                                                                                        // yeux normaux et sourire
      ctx.fillStyle = '#20140c'; ctx.beginPath(); ctx.arc(3, -1, 1.5, 0, Math.PI * 2); ctx.arc(8, -1, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(6, 4, 3.5, 0.15, Math.PI - 0.15); ctx.stroke();
    } else {                                                                                           // orbites creuses, bouche ouverte
      ctx.fillStyle = '#05080a'; ctx.beginPath(); ctx.ellipse(3, -1, 2.8, 3.2, 0, 0, Math.PI * 2); ctx.ellipse(8.5, -1, 2.8, 3.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, 6, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    membreH(4, -36, brasA + 0.1 * Math.sin(t * 2.4) * (sain ? 0 : 1), 0.2, peau, 9, 8);                // bras proche
    ctx.restore();
    ctx.restore();
  };

  ctx.save(); ctx.translate(sx, sy); ctx.scale(h.sens * K, K); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (c < 1) {                                                                                         // aura verte et spores
    ctx.globalCompositeOperation = 'lighter';
    const au = ctx.createRadialGradient(0, -60, 5, 0, -60, 95); au.addColorStop(0, `rgba(110,255,120,${0.3 * (1 - c)})`); au.addColorStop(1, 'rgba(110,255,120,0)');
    ctx.fillStyle = au; ctx.fillRect(-100, -160, 200, 200);
    for (let i = 0; i < 9; i++) {
      const u = ((t * 0.35 + i / 9) % 1), x = Math.sin(i * 2.7 + t) * 38, y = -10 - u * 130;
      ctx.fillStyle = `rgba(170,255,140,${0.7 * (1 - u) * (1 - c)})`; ctx.beginPath(); ctx.arc(x, y, 1.6 + (i % 3) * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    corps(PEAU_MALADE, TISSU_MALADE, false, 1);
  }
  if (c > 0) corps(PEAU_SAINE, TISSU_SAIN, true, c);
  if (c < 1) {                                                                                         // yeux verts lumineux
    ctx.globalCompositeOperation = 'lighter';
    const hx = 5 + 5 * lean * 2, hyy = hy - 53 + 0;
    ctx.save(); ctx.translate(0, hy); ctx.rotate(lean); ctx.translate(5 + 5 * lean * 10 * 0.2, -53);
    [3, 8.5].forEach(x => { const e = ctx.createRadialGradient(x, -1, 0, x, -1, 9); e.addColorStop(0, `rgba(150,255,120,${0.95 * (1 - c)})`); e.addColorStop(1, 'rgba(150,255,120,0)'); ctx.fillStyle = e; ctx.fillRect(x - 9, -10, 18, 18); });
    ctx.restore(); ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function dessinerHumains(t) {
  const tt = t / 1000;
  humains.forEach(h => {
    const sx = h.x - camX;
    if (sx < -120 || sx > W + 120) return;
    dessinerHumain(h, sx, tt);
    if (h.etat === 'malade') { dessinerBouclier(h, sx, tt); if (lunettesAlpha > 0.35 && Math.abs(h.x - heros.x) < 650) dessinerScan(h, sx, tt); }
    if (h.etat === 'malade') {
      if (h.meter > 0.02) {                              // la jauge de contamination au-dessus de sa tête
        const cx = sx, cy = SOL_Y - 175;
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(20,10,10,0.6)'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = h.meter > 0.6 ? '#ff4a4a' : '#ffb84a'; ctx.beginPath(); ctx.arc(cx, cy, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * h.meter); ctx.stroke();
        ctx.fillStyle = '#fff4dc'; ctx.font = "600 18px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = 'center'; ctx.fillText('!', cx, cy + 6); ctx.textAlign = 'start';
      } else if (Math.abs(h.x - heros.x) < 560) {        // le rappel de ce qu'il faut faire, étape par étape
        const n = tailleFenetre;
        pilule(!h.vuln ? (!lunettes ? "Mets les lunettes (L) pour voir son infection" : outilActif !== 'flou' ? "Choisis la Brume 🌫️ (touche 1) pour chercher son point faible" : `E : scanner avec une carte ${n}×${n}`)
                       : (outilActif === 'vapeur' ? 'E : tirer la vapeur 💨' : "Point faible trouvé ! Choisis la Vapeur 💨 (touche 4)"), sx, SOL_Y - 185);
      }
      if (lunettesAlpha > 0.3) { ctx.save(); ctx.globalAlpha = lunettesAlpha; ctx.fillStyle = '#ffb870'; ctx.font = "600 20px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = 'center'; ctx.fillText('⚠ Humain contaminé', sx, SOL_Y - 150); ctx.restore(); }
    } else if (performance.now() - h.tSoin < 4000) {
      pilule('Merci, chevalier !', sx, SOL_Y - 165);
    }
  });
}

function dessinerVapeur(t) {                             // les nuages de vapeur tirés par le pistolet
  vapeurs.forEach(v => {
    const sx = v.x - camX, rayon = 10 + v.age * 30, a = 1 - v.age / 0.9;
    for (let k = 0; k < 5; k++) {
      const x = sx - Math.sign(v.vx) * k * 11, r = rayon * (1 - k * 0.12), g = ctx.createRadialGradient(x, v.y, 0, x, v.y, r);
      g.addColorStop(0, `rgba(235,248,255,${0.75 * a * (1 - k * 0.17)})`); g.addColorStop(1, 'rgba(200,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, v.y - r, 2 * r, 2 * r);
    }
  });
}

/* ---------- Le scan de l'infection, la bulle de spores, le point faible ---------- */
function chaleur(v) {                                   // 0 -> violet foncé, 0.5 -> vert, 1 -> rouge (carte de chaleur)
  const st = [[0, [20, 10, 50]], [0.25, [40, 60, 200]], [0.5, [40, 200, 140]], [0.75, [250, 220, 60]], [1, [255, 60, 40]]], t = Math.max(0, Math.min(1, v));
  for (let i = 1; i < st.length; i++) if (t <= st[i][0]) { const [a, ca] = st[i - 1], [b, cb] = st[i], u = (t - a) / (b - a); return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * u)).join(',')})`; }
  return 'rgb(255,60,40)';
}
function dessinerScan(h, sx, tt) {
  const sc = h.scan, cs = 9, w = SCAN_W * cs, hh = SCAN_H * cs, x0 = sx - w / 2, y0 = SOL_Y - 345, anim = sc.etat === 'anim', k = anim ? sc.anim.k : 0;
  ctx.save(); ctx.globalAlpha = Math.min(1, (lunettesAlpha - 0.3) * 2);
  ctx.fillStyle = 'rgba(10,6,24,0.9)'; ctx.beginPath(); ctx.roundRect(x0 - 8, y0 - 22, w + 16, hh + 46, 10); ctx.fill(); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#ffd166'; ctx.font = "600 13px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = 'left'; ctx.fillText("Scan de l'infection", x0, y0 - 7);
  for (let i = 0; i < SCAN_W * SCAN_H; i++) {
    const brut = sc.g[i] ? '#6fe86a' : '#14101f';
    ctx.fillStyle = sc.etat === 'bruit' ? brut : anim ? (i < k ? chaleur(sc.s[i]) : brut) : chaleur(sc.s[i]);
    ctx.fillRect(x0 + (i % SCAN_W) * cs, y0 + Math.floor(i / SCAN_W) * cs, cs - 1, cs - 1);
  }
  if (anim && k < SCAN_W * SCAN_H) {                                                    // la fenêtre qui glisse
    const n = sc.anim.n, x = k % SCAN_W, y = Math.floor(k / SCAN_W);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x0 + (x - (n - 1) / 2) * cs, y0 + (y - (n - 1) / 2) * cs, n * cs - 1, n * cs - 1);
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.strokeRect(x0 + (x - (n - 1) / 2) * cs, y0 + (y - (n - 1) / 2) * cs, n * cs - 1, n * cs - 1);
  }
  ctx.font = "600 12px 'Baloo 2', system-ui, sans-serif"; ctx.fillStyle = '#fff4dc';
  if (sc.etat === 'trouve' || sc.etat === 'echec') {                                    // la tache la plus chaude est entourée
    const pk = sc.anim.ev.pk, px = x0 + (pk % SCAN_W) * cs + cs / 2, py = y0 + Math.floor(pk / SCAN_W) * cs + cs / 2;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, cs * 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = sc.etat === 'trouve' ? '#9ff58a' : '#ff9a8a'; ctx.fillText(sc.etat === 'trouve' ? '✔ Point faible trouvé !' : '✘ Plusieurs taches chaudes', x0, y0 + hh + 14);
  } else ctx.fillText(anim ? 'Le flou fait la moyenne…' : 'Où est le point faible ?', x0, y0 + hh + 14);
  ctx.restore();
}
function dessinerBouclier(h, sx, tt) {
  const cy = SOL_Y - 62, flash = Math.max(0, 1 - (performance.now() - h.bouclierT) / 350);
  ctx.save();
  if (!h.vuln) {                                                                        // la bulle de spores qui protège l'humain
    const g = ctx.createRadialGradient(sx, cy, 20, sx, cy, 92); g.addColorStop(0, 'rgba(120,255,120,0.04)'); g.addColorStop(1, `rgba(120,255,120,${0.22 + 0.5 * flash})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, cy, 52, 86, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(170,255,150,${0.45 + 0.5 * flash + 0.1 * Math.sin(tt * 3)})`; ctx.lineWidth = 2 + 3 * flash; ctx.stroke();
  } else {                                                                              // bulle percée : le point faible brille sur sa poitrine
    ctx.globalCompositeOperation = 'lighter'; const p = 0.6 + 0.4 * Math.sin(tt * 6), g = ctx.createRadialGradient(sx, SOL_Y - 82, 0, sx, SOL_Y - 82, 30);
    g.addColorStop(0, `rgba(255,120,80,${0.9 * p})`); g.addColorStop(1, 'rgba(255,120,80,0)'); ctx.fillStyle = g; ctx.fillRect(sx - 30, SOL_Y - 112, 60, 60);
  }
  ctx.restore();
}