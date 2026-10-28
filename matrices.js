/* =====================================================
   LA VUE MATRICES : Entrée → Filtre → Résultat (pièges « trou » et « buisson », qui sont des grilles de 0 et de 1)
   Rien n'est simulé : on relit p.phases (calculé par balayer() dans convolution.js) et on refait le calcul de la case courante avec voisinsDe().
   Érosion  = on garde 1 seulement si TOUTES les cases du filtre valent 1 (somme = n×n)
   Dilatation = 1 dès qu'UNE case du filtre vaut 1 (somme ≥ 1)
   Fermeture = Dilatation PUIS Érosion ; Ouverture = Érosion PUIS Dilatation : deux opérations de morphologie, pas une convolution classique.
   ===================================================== */
const NOM_MORPHO = { minimum: 'Érosion', maximum: 'Dilatation' };
const AIDE_MORPHO = { minimum: "Érosion : je garde 1 seulement si TOUTES les cases du filtre valent 1.", maximum: "Dilatation : un seul 1 sous le filtre suffit pour obtenir 1." };
const COMPOSE = { ouverture: 'OUVERTURE = Érosion puis Dilatation', fermeture: 'FERMETURE = Dilatation puis Érosion (2 opérations, pas une convolution)' };
const COUL_M = { libre: '#2b2160', terre: '#9a6b3f', vert: '#3f9e5f', danger: '#ff5a4a' };

function dessinerPanneauMatrices(p) {
  if ((p.type !== 'trou' && p.type !== 'buisson') || p.numerique) return;
  const anim = p.etat === 'anim';
  if (anim) p.snap = { phases: p.phases, a: { ph: p.anim.ph, k: p.anim.k, n: p.anim.n } };
  const S = p.snap; if (!S || !S.phases) return;
  if (!anim && !(p.vueFin && performance.now() - p.vueFin < 6000)) return;
  const cols = p.cols, rows = p.rows, L = p.type === 'buisson' ? rows - 2 : rows, nPh = S.phases.length, fin = !anim;
  const ph = S.phases[fin ? nPh - 1 : S.a.ph], ent = fin ? S.phases[0].entree : ph.entree, sor = ph.sortie, n = S.a.n, nn = tailleDe(ph.op, n);
  const k = Math.min(S.a.k, cols * rows - 1), c = Math.floor(k / rows), r = k % rows;
  const s = Math.max(14, Math.min(26, Math.floor((W - 90) / (2 * cols + nn)))), gap = 34, wE = cols * s, wF = nn * s, hM = L * s;
  const x0 = Math.round((W - (2 * wE + wF + 2 * gap)) / 2), y0 = 46, xF = x0 + wE + gap, xS = xF + wF + gap, yF = y0 + Math.max(0, (hM - wF) / 2);
  if (!p.trouCol) p.trouCol = Array.from({ length: cols }, (_, i) => p.g[(rows - 1) * cols + i] === 0);
  const txt = (t, x, y, sz, col, al = 'center') => { ctx.font = `600 ${sz}px 'Baloo 2', system-ui, sans-serif`; ctx.fillStyle = col; ctx.textAlign = al; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y); };
  const couleur = (i, v) => v === 1 ? (p.type === 'trou' ? COUL_M.terre : (p.tigesIdx.includes(i) ? COUL_M.danger : COUL_M.vert)) : (p.type === 'trou' && p.trouCol[i % cols] ? COUL_M.danger : COUL_M.libre);
  const grille = (g, x, y, ok) => { for (let rr = 0; rr < L; rr++) for (let cc = 0; cc < cols; cc++) { const i = rr * cols + cc, v = g[i], vu = ok(cc, rr);
    ctx.fillStyle = vu ? couleur(i, v) : '#1a1438'; ctx.fillRect(x + cc * s + 1, y + rr * s + 1, s - 2, s - 2);
    txt(vu ? v : '·', x + cc * s + s / 2, y + rr * s + s / 2 + 1, Math.round(s * 0.55), vu ? '#fff' : '#6a5aa0'); } };
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,24,0.88)'; ctx.fillRect(x0 - 16, 6, 2 * wE + wF + 2 * gap + 32, y0 + hM + 100); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.strokeRect(x0 - 16, 6, 2 * wE + wF + 2 * gap + 32, y0 + hM + 100);
  txt(COMPOSE[p.outil] || NOM_MORPHO[ph.op], W / 2, 20, 15, '#ffd166');
  txt((fin ? 'ENTRÉE' : (nPh > 1 ? `ÉTAPE ${S.a.ph + 1}/${nPh} · ` : '') + 'ENTRÉE') + ' (0 libre, 1 plein)', x0 + wE / 2, y0 - 10, 12, '#bfb3ff'); txt('FILTRE ' + nn + '×' + nn, xF + wF / 2, y0 - 10, 12, '#bfb3ff'); txt('RÉSULTAT', xS + wE / 2, y0 - 10, 12, '#bfb3ff');
  txt('→', x0 + wE + gap / 2, yF + wF / 2, 22, '#fff'); txt('→', xF + wF + gap / 2, yF + wF / 2, 22, '#fff');
  const dedans = (cc, rr) => Math.abs(cc - c) <= (nn - 1) / 2 && Math.abs(rr - r) <= (nn - 1) / 2;
  grille(ent, x0, y0, () => true);
  if (!fin) { ctx.fillStyle = 'rgba(255,209,102,0.38)'; for (let rr = 0; rr < L; rr++) for (let cc = 0; cc < cols; cc++) if (dedans(cc, rr)) ctx.fillRect(x0 + cc * s, y0 + rr * s, s, s);
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.strokeRect(x0 + (c - (nn - 1) / 2) * s, y0 + (r - (nn - 1) / 2) * s, nn * s, nn * s); }
  const rgb = COULEUR_OP[ph.op]; for (let j = 0; j < nn * nn; j++) { const fx = xF + (j % nn) * s, fy = yF + Math.floor(j / nn) * s; ctx.fillStyle = `rgba(${rgb},0.5)`; ctx.fillRect(fx + 1, fy + 1, s - 2, s - 2); txt('1', fx + s / 2, fy + s / 2 + 1, Math.round(s * 0.55), '#fff'); }
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.strokeRect(xF, yF, wF, wF);
  grille(sor, xS, y0, (cc, rr) => fin || cc * rows + rr < k);
  if (!fin) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(xS + c * s, y0 + r * s, s, s); }
  const yb = y0 + hM + 20, vois = voisinsDe(ent, cols, rows, c, r, nn), somme = vois.reduce((a, b) => a + b, 0);
  if (!fin) {
    const bord = c - (nn - 1) / 2 < 0 || r - (nn - 1) / 2 < 0 || c + (nn - 1) / 2 > cols - 1 || r + (nn - 1) / 2 > rows - 1, pl = ph.op === 'minimum';
    txt(`Case (${c + 1};${r + 1}) : ${nn <= 3 ? vois.join('+') + ' = ' : 'somme = '}${somme}  →  ${pl ? (somme === nn * nn ? `${somme} = ${nn * nn} : tout est plein` : `${somme} < ${nn * nn} : il y a du vide`) : (somme >= 1 ? 'au moins un 1' : 'que des 0')}  →  ${sor[r * cols + c]}`, W / 2, yb, 14, '#fff');
    txt(AIDE_MORPHO[ph.op] + (bord ? '  (bord : on répète la case du bord)' : ''), W / 2, yb + 24, 12, '#ffd166');
  } else {
    const cmp = g => p.type === 'trou' ? g.slice((rows - 1) * cols).filter(v => v === 0).length : p.tigesIdx.filter(i => g[i] === 1).length, quoi = p.type === 'trou' ? 'cases de trou' : 'tiges épineuses';
    const ok = reussiAvec(p, S.phases[nPh - 1].sortie), nMin = tailleMinimale(p), nMax = tailleMaximale(p);
    txt(`${ok ? '✅ Filtre adapté' : '❌ Filtre non adapté'} · avant : ${cmp(S.phases[0].entree)} ${quoi} · après : ${cmp(S.phases[nPh - 1].sortie)}`, W / 2, yb, 14, ok ? '#7dffa0' : '#ff9a8a');
    txt(ok ? `Ta carte ${n}×${n} suffit (minimum : ${nMin}×${nMin}).` : n < nMin ? `Carte ${n}×${n} trop petite : il faut au moins ${nMin}×${nMin}.` : `Carte ${n}×${n} trop grande : elle abîme ce qu'il faut garder (maximum : ${nMax}×${nMax}).`, W / 2, yb + 24, 12, '#ffd166');
  }
  ctx.restore();
}
