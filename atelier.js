/* =====================================================
   LA CARTE QUI CONSTRUIT : l'enfant fait le calcul case après case, et le piège se construit sous ses yeux
   Version 4. À chaque réponse, la carte construit VRAIMENT un morceau du piège : c'est l'enfant qui bâtit.

   1. E : la carte glisse sur le piège et s'arrête sur une case importante (une case du trou, une tige…).
   2. La loupe (à droite) montre en grand les cases sous la carte ; la case du milieu est un ❓.
      La règle tient en une ligne avec des images : « 1 🟫 sous ta carte suffit → 🟫 ».
   3. L'enfant répond (gros boutons, ou flèches ← → ↓). AU MÊME MOMENT, la colonne est construite dans le vrai piège
      (les briques montent dans le trou, la tige tombe…) et on compte avec lui les cases qui ont décidé : 1, 2, 3…
   4. La carte glisse jusqu'à la case suivante (les cases sans surprise se font toutes seules, en glissant), nouvelle question…
   5. Le trou se bouche brique après brique, À CHAQUE RÉPONSE. Étape 2 (lisser) : une question aussi.
   Rapide : 2 à 4 questions par étape, réponse visible en moins d'une seconde quand elle est juste.
   Le calcul ne change pas : il est fait d'avance par balayer() (convolution.js).
   ===================================================== */
const ATELIER_ACTIF = true;
const TYPES_ATELIER = ['sable', 'trou', 'buisson', 'tornade', 'brouillard', 'mur'];
const VAGUE = 18;                                                // colonnes par seconde quand la carte glisse d'une question à l'autre
const PAS_COMPTE = 90;                                           // ms entre deux cases comptées (1, 2, 3…) : vite, mais on le voit
const MAX_QUESTIONS = 4;
const elAtelier = document.getElementById('atelier'), atCanvas = document.getElementById('atelier-canvas'), ac = atCanvas.getContext('2d');
const elAtTitre = document.getElementById('atelier-titre'), elAtProgres = document.getElementById('atelier-progres');
const AT_L = 300, AT_H = 236;
let atelierFin = null, atelierCam = null;
(() => { const d = Math.min(2, window.devicePixelRatio || 1); atCanvas.width = AT_L * d; atCanvas.height = AT_H * d; ac.setTransform(d, 0, 0, d, 0, 0); })();

/* La question et les boutons de réponse : fabriqués ici, pas besoin de toucher à index.html */
const elAtQ = document.createElement('p'), elAtChoix = document.createElement('div');
elAtQ.id = 'atelier-question'; elAtQ.setAttribute('role', 'status'); elAtChoix.id = 'atelier-choix'; elAtChoix.hidden = true;
atCanvas.after(elAtQ, elAtChoix);
document.getElementById('atelier-auto').style.display = 'none';   // plus besoin du bouton Auto
document.head.insertAdjacentHTML('beforeend', `<style>
#atelier-canvas { cursor: default; }
#bulle:empty { display: none; }
.at-c { display: inline-block; width: 1em; height: 1em; border-radius: 3px; border: 2px solid rgba(255,244,220,.85); vertical-align: -0.15em; }
#atelier-question { margin: .4em .2em .35em; min-height: 2.5em; text-align: center; color: #fff4dc; font: 600 clamp(11px, 1.4cqw, 19px)/1.25 'Baloo 2', system-ui, sans-serif; }
#atelier-question b { color: #ffd166; } #atelier-question.bon { color: #8ff0c0; } #atelier-question.faux { color: #ffb4bd; }
#atelier-choix { display: flex; gap: .45em; justify-content: center; }
#atelier-choix[hidden] { display: none; }
#atelier-choix button { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: .2em; padding: .35em .2em .25em; border-radius: 14px; cursor: pointer;
  border: 2px solid #c9972e; background: radial-gradient(ellipse at 50% 25%, #3d2a72, #120a28 85%); color: #fff4dc; font: 700 clamp(11px, 1.35cqw, 18px)/1.1 'Baloo 2', system-ui, sans-serif;
  transition: transform .12s, box-shadow .12s, opacity .2s; }
#atelier-choix button:hover, #atelier-choix button:focus-visible { transform: translateY(-3px); box-shadow: 0 0 14px #ffd166; outline: none; }
#atelier-choix i { display: block; width: 2.3em; height: 2.3em; border-radius: 8px; border: 2px solid rgba(255,244,220,.85); font-style: normal; font-size: 1em; line-height: 2.2em; }
#atelier-choix kbd { font: inherit; font-size: .72em; opacity: .65; }
#atelier-choix button.bon { border-color: #8ff0c0; box-shadow: 0 0 18px #8ff0c0; transform: scale(1.06); }
#atelier-choix button.faux { border-color: #ff9aa8; opacity: .55; }
#atelier-choix button:disabled { cursor: default; }
</style>`);

const lignesVisibles = p => p.type === 'buisson' ? p.rows - 2 : p.rows;
const borne = (v, a, b) => Math.max(a, Math.min(b, v));
const pieceAtelier = () => pieges.find(p => p.etat === 'anim' && p.anim && p.anim.manuel);
const jeuEnPause = () => accueilOuvert || aideOuvert || confirmOuvert || ecranOuvert || introOuvert || (typeof laboOuvert !== 'undefined' && laboOuvert);
function atelierPour(p) { return ATELIER_ACTIF && TYPES_ATELIER.includes(p.type); }
const memeValeur = (u, v) => Array.isArray(u) ? Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) + Math.abs(u[2] - v[2]) < 12 : Math.abs(u - v) < 0.05;   // nombres (tornade) : presque égaux suffit

/* ---------- Les couleurs (les mêmes dans la loupe, dans les boutons et sur le vrai piège) ---------- */
function couleurAt(p, v, r, op) {
  if (Array.isArray(v)) return `rgb(${v[0]},${v[1]},${v[2]})`;
  if (p.type === 'mur' && op === 'contour') return couleurPixel(p, v, 'contour');                  // Fusain : noir = rien, orange = un trait
  if (p.type === 'brouillard' || p.type === 'mur') return couleurPixel(p, 0.5 + (v - 0.5) * (p.type === 'mur' ? 3.5 : 2.2), 'gauss');   // gris renforcés : les petites différences se voient
  if (p.numerique) return couleurPixel(p, v, 'gauss');                                      // tornade : foncé = vide, clair = débris ; brouillard : foncé = poteau, clair = lanterne
  if (p.type === 'trou') return v ? '#b06a3a' : (r === p.rows - 1 ? '#05030a' : '#2c2350');   // terre / trou noir / air
  return v ? '#5fb04a' : '#1b1233';                                                          // végétation / vide
}
/* La rangée où la carte glisse entre deux questions (là où l'action se voit le mieux) */
function rangeeCle(p, ph) {
  if (p.type === 'trou') return p.rows - 1;
  if (p.type === 'buisson') return ph === 0 ? p.epais + 1 : p.epais;
  return Math.floor(lignesVisibles(p) / 2);
}
const lumiere = v => v[0] + v[1] + v[2];
function grains(p) { const t = p.g.map(lumiere), lo = Math.min(...t), hi = Math.max(...t); return { clair: p.g[t.indexOf(hi)], fonce: p.g[t.indexOf(lo)], mi: (lo + hi) / 2 }; }
function etaler(l, m) { if (l.length <= m) return l; return Array.from({ length: m }, (_, k) => l[Math.round(k * (l.length - 1) / (m - 1))]); }

/* Les cases où l'enfant répond : celles qui racontent la construction */
function clesPour(p, ph) {
  const P = p.phases[ph], vis = lignesVisibles(p), change = i => !memeValeur(P.entree[i], P.sortie[i]);
  let l = [];
  if (ph === 0 && p.type === 'trou') for (let c = 3; c < 3 + p.large; c++) l.push({ c, r: p.rows - 1 });
  else if (ph === 0 && p.type === 'buisson') l = [...new Set(p.tiges.map(Math.floor))].map(c => ({ c, r: p.epais + 1 }));
  else if (p.type === 'tornade') {                                                                                     // un débris à gauche, l'ŒIL, un débris à droite
    const r = Math.floor(p.rows / 2), plusAgite = (c0, c1) => { let m = null; for (let c = c0; c <= c1; c++) { const i = r * p.cols + c, d = Math.abs(P.entree[i] - P.sortie[i]); if (!m || d > m.d) m = { c, r, d }; } return m; };
    let ro = 0; for (let y = 1; y < p.rows; y++) if (P.sortie[y * p.cols + 7] > P.sortie[ro * p.cols + 7]) ro = y;      // l'œil : la case où les débris risquent le plus d'entrer
    l = [plusAgite(2, 5), { c: 7, r: ro }, plusAgite(9, 12)];
  } else if (p.type === 'brouillard') {                                                                                 // une lanterne, un poteau, et l'endroit le plus difficile à voir
    const r = 1, marge = c => { const v = P.sortie[r * p.cols + c] - 0.5; return p.info.pat[c] ? v : -v; }, cs = [];
    for (let c = 2; c < p.cols - 2; c++) cs.push(c);
    const dur = cs.reduce((m, c) => marge(c) < marge(m) ? c : m), autre = cs.filter(c => p.info.pat[c] !== p.info.pat[dur] && Math.abs(c - dur) >= 3);
    const loin = cs.filter(c => p.info.pat[c] === p.info.pat[dur] && Math.abs(c - dur) >= 5);
    l = [dur, autre[Math.floor(autre.length / 2)], loin[0]].filter(c => c !== undefined).sort((a, b) => a - b).map(c => ({ c, r }));
  } else if (p.type === 'mur') {                                                                                       // le mur loin de la porte, le bord de la porte, le milieu de la porte
    l = [{ c: 2, r: 3 }, { c: PORTE.c0, r: 3 }, { c: PORTE.c0 + 1, r: 3 }];
  } else if (p.type === 'sable') {                                                                                        // 3 endroits, du plus foncé au plus clair
    const { mi } = grains(p), r = Math.floor(vis / 2), cand = [];
    for (let c = 2; c < p.cols - 2; c++) cand.push({ c, r, x: lumiere(P.sortie[r * p.cols + c]) });
    const fonce = cand.reduce((m, k) => k.x < m.x ? k : m), clair = cand.reduce((m, k) => k.x > m.x ? k : m), moyen = cand.reduce((m, k) => Math.abs(k.x - mi) < Math.abs(m.x - mi) ? k : m);
    l = [fonce, moyen, clair].filter((k, i, t) => t.findIndex(o => o.c === k.c) === i).sort((a, b) => a.c - b.c);
  } else {                                                                                                              // étape 2 : UNE case qui change (le pont qui tombe, la voûte qui repousse)
    const centre = p.type === 'trou' ? 3 + p.large / 2 : p.cols / 2, cand = [];
    for (let r = vis - 1; r >= 0; r--) for (let c = 0; c < p.cols; c++) if (change(r * p.cols + c)) cand.push({ c, r, d: Math.abs(c - centre) + (vis - 1 - r) * 0.5 });
    if (cand.length) l = [cand.reduce((m, k) => k.d < m.d ? k : m)];
  }
  return etaler(l, MAX_QUESTIONS).map(k => ({ c: k.c, r: k.r }));
}

// Les cases qui « comptent » (on les compte avec l'enfant) : Mortier = les briques ; Faucille = les vides ; Brume = les grains clairs ; Berceuse = les débris
function compte(p, op, v) {
  if (op === 'nettete' || op === 'contour' || p.type === 'mur') return false;
  return op === 'maximum' ? v === 1 : op === 'minimum' ? v === 0 : op === 'gauss' ? v > 0.5 : lumiere(v) > grains(p).mi;
}
// La « vraie » réponse d'une case. Pour le Fusain, la question est : y a-t-il un trait (oui / non) ?
function verite(p, ph, i) {
  if (ph.op === 'nettete') return p.info.pat[i % p.cols];                                        // Lynx : la case cache une lanterne (1) ou un poteau (0)
  return ph.sortie[i];
}

/* ---------- LES MOTS POUR L'ENFANT : phrases courtes, des images, des mots de tous les jours ---------- */
function regle(p, op) {
  if (op === 'maximum') return p.type === 'trou'
    ? '🧱 <b>Le Mortier :</b> s\'il y a <b>au moins une brique</b> sous ta carte, la case devient une brique.'
    : '🌱 <b>La voûte repousse :</b> s\'il y a <b>au moins une feuille</b> sous ta carte, la case redevient feuille.';
  if (op === 'minimum') return p.type === 'trou'
    ? '🧹 <b>On enlève ce qui dépasse :</b> s\'il y a <b>au moins une case vide</b> sous ta carte, la brique s\'en va.'
    : '✂️ <b>La Faucille :</b> s\'il y a <b>au moins une case vide</b> sous ta carte, la branche est coupée.';
  if (op === 'moyenne') return '🌫️ <b>La Brume :</b> elle mélange toutes les couleurs sous ta carte, comme de la peinture.';
  if (op === 'gauss') return p.type === 'mur'
    ? '🧽 <b>On nettoie le mur :</b> la carte mélange les cases pour effacer les petites taches. Le centre ● compte plus.'
    : '🌀 <b>La Berceuse :</b> elle mélange les cases sous ta carte. Les gros points ● du centre comptent plus.';
  if (op === 'nettete') return '🔎 <b>Le Lynx voit à travers le brouillard :</b><br>case <b>un peu claire</b> → une lanterne 🏮 · case <b>un peu sombre</b> → un poteau 🪵';
  if (op === 'contour') return '✏️ <b>Le Fusain :</b><br><b>les deux couleurs</b> ☐■ sous ta carte → un trait · <b>une seule couleur</b> → rien';
  return '';
}
function question(p, op) {
  if (op === 'contour') return 'Sous ta carte, y a-t-il <b>les deux couleurs</b> ?';
  if (op === 'nettete') return 'Que cache la case <b>❓</b> ?';
  return 'Que devient la case <b>❓</b> ?';
}
function choixPour(p, op, i) {
  if (op === 'moyenne') {                                     // 3 mélanges : le bon, et deux autres bien différents, rangés du foncé au clair
    const { clair, fonce } = grains(p), N = tailleDe(op, p.anim.n) ** 2, ph = p.phases[0], k = Math.round((lumiere(ph.sortie[i]) - lumiere(fonce)) / (lumiere(clair) - lumiere(fonce)) * N);
    const mix = j => [0, 1, 2].map(q => Math.round((j * clair[q] + (N - j) * fonce[q]) / N)), pas = Math.max(2, Math.round(N / 3));
    let autres = [k - pas, k + pas, k - 2 * pas, k + 2 * pas].filter(j => j >= 0 && j <= N).slice(0, 2);
    const js = [k, ...autres].sort((a, b) => a - b), noms = ['Foncé', 'Moyen', 'Clair'];
    return js.map((j, q) => ({ v: j === k ? ph.sortie[i] : mix(j), nom: noms[js.length === 3 ? q : q * 2] }));
  }
  if (op === 'contour') return [{ v: 1, nom: 'Oui → un trait', ic: '✏️' }, { v: 0, nom: 'Non → rien', ic: '' }];
  if (op === 'nettete') {                                     // le Lynx : plus sombre, pareille, ou plus claire ?
    return [{ v: 1, nom: 'Une lanterne', ic: '🏮', fond: 'transparent' }, { v: 0, nom: 'Un poteau', ic: '🪵', fond: 'transparent' }];
  }
  if (op === 'gauss') {                                       // 3 gris : le bon, et deux autres bien différents
    const v = p.phases[p.anim.ph].sortie[i], oeil = p.type === 'tornade' && i % p.cols >= 6 && i % p.cols < 9, pas = p.type === 'mur' ? 0.15 : 0.35;
    const autres = oeil && v > 0.16 ? [0, Math.min(1, v + 0.4)]                                  // l'œil : « tout noir » est toujours proposé, pour voir s'il le reste
      : [v - pas, v + pas, v - 2 * pas, v + 2 * pas].filter(x => x >= -0.03 && x <= 1.03).slice(0, 2).map(x => borne(x, 0, 1));
    const vs = [v, ...autres].sort((a, b) => a - b), noms = oeil && v > 0.16 ? ['Tout noir', 'Gris', 'Clair'] : ['Sombre', 'Gris', 'Clair'];
    return vs.map((x, q) => ({ v: x, nom: noms[vs.length === 3 ? q : q * 2] }));
  }
  if (p.type === 'trou') return op === 'maximum' ? [{ v: 1, nom: 'Une brique', ic: '🧱' }, { v: 0, nom: 'Vide', ic: '⬛' }] : [{ v: 1, nom: 'Elle reste', ic: '🧱' }, { v: 0, nom: 'Elle s\'en va', ic: '💨' }];
  if (op === 'minimum') return [{ v: 1, nom: 'Elle reste', ic: '🌿' }, { v: 0, nom: 'Coupée', ic: '✂️' }];
  return [{ v: 1, nom: 'Une feuille', ic: '🌿' }, { v: 0, nom: 'Vide', ic: '⬛' }];
}
const TOUCHES = ['←', '→', '↓'];
function poserQuestion(p) {
  const a = p.anim, ph = p.phases[a.ph], k = a.cles[a.q], i = k.r * p.cols + k.c;
  a.choix = choixPour(p, ph.op, i); a.mode = 'question';
  elAtQ.className = ''; elAtQ.innerHTML = regle(p, ph.op) + '<br>' + question(p, ph.op);
  elAtChoix.innerHTML = a.choix.map((ch, j) => `<button type="button" data-j="${j}"><i style="background:${ch.fond || couleurAt(p, ch.v, k.r, ph.op)}">${ch.ic || ''}</i>${ch.nom}<kbd>${TOUCHES[j]}</kbd></button>`).join('');
  elAtChoix.hidden = false;
}
function expliquerReponse(p, bon) {
  const a = p.anim, ph = p.phases[a.ph], k = a.cles[a.q], i = k.r * p.cols + k.c, nn = tailleDe(ph.op, a.n);
  const vois = voisinsDe(ph.entree, p.cols, p.rows, k.c, k.r, nn), nb = vois.filter(v => compte(p, ph.op, v)).length, res = ph.sortie[i];
  const sw = (v, op) => `<i class="at-c" style="background:${couleurAt(p, v, k.r, op)}"></i>`, s_ = n => n > 1 ? 's' : '';
  let t;
  if (ph.op === 'maximum' && p.type === 'trou') {
    t = nb ? `Ta carte touche <b>${nb} brique${s_(nb)}</b> → la case devient une brique 🧱` : 'Ta carte ne touche <b>aucune brique</b> → la case reste vide ⬛';
    if (a.ph === 0 && !res) t += '<br>😮 Ta carte n\'atteint pas le bord du trou : prends une carte <b>plus grande</b> !';
  } else if (ph.op === 'maximum') {
    t = nb ? `Ta carte voit <b>${nb} feuille${s_(nb)}</b> → la case redevient feuille 🌿` : 'Aucune feuille sous ta carte → la case reste vide.';
  } else if (ph.op === 'minimum' && p.type === 'trou') {
    t = nb ? `Ta carte voit <b>${nb} case${s_(nb)} vide${s_(nb)}</b> → la brique en trop s'en va 💨` : 'Que des briques sous ta carte → la brique reste 🧱';
  } else if (ph.op === 'minimum') {
    t = nb ? `Ta carte voit <b>${nb} case${s_(nb)} vide${s_(nb)}</b> → la branche est coupée ✂️` : 'Que des feuilles sous ta carte → la branche reste 🌿';
    if (a.ph === 0 && res) t += '<br>😮 La tige est plus large que ta carte : prends une carte <b>plus grande</b> !';
  } else if (ph.op === 'moyenne') {
    const N = nn * nn; t = `<b>${nb}</b> grain${s_(nb)} clair${s_(nb)} et <b>${N - nb}</b> foncé${s_(N - nb)} → ${nb > N / 2 ? 'un mélange plutôt clair' : nb < N / 2 ? 'un mélange plutôt foncé' : 'moitié-moitié'} ${sw(res)}`;
  } else if (ph.op === 'gauss' && p.type === 'mur') {
    t = `Les taches sous ta carte se mélangent ${sw(ph.entree[i])} → ${sw(res)} : le mur devient plus lisse 🧽`;
  } else if (ph.op === 'gauss') {
    const N = nn * nn, oeil = k.c >= 6 && k.c < 9, nom = (a.choix.find(ch => memeValeur(ch.v, res)) || { nom: 'gris' }).nom.toLowerCase();
    t = `<b>${nb}</b> débris sur ${N}, et ceux du centre comptent plus → ${nom} ${sw(res)}`;
    if (oeil) t += res > 0.16 ? '<br>😮 Des débris entrent dans l\'œil : ta carte est <b>trop grande</b> !' : '<br>👍 L\'œil de la tornade reste calme !';
    else if (a.n < tailleMinimale(p)) t += '<br>😮 Ça tourne encore : ta carte est <b>trop petite</b> pour bien calmer !';
  } else if (ph.op === 'nettete') {
    const lant = p.info.pat[k.c], marge = lant ? res - 0.5 : 0.5 - res, nom = lant ? 'une lanterne 🏮' : 'un poteau 🪵';
    t = `La case ${sw(ph.entree[i])} est <b>un peu ${lant ? 'claire' : 'sombre'}</b> : elle cache ${nom}.`;
    t += marge >= 0.12 ? `<br>Le Lynx l'a rendue <b>bien ${lant ? 'claire' : 'sombre'}</b> ${sw(res)} : on la voit !` : `<br>😮 Mais elle est encore dans le brouillard ${sw(res)} : ta carte est <b>trop petite</b> !`;
  } else if (ph.op === 'contour') {
    const nc = vois.filter(v => v === 1).length, ns = vois.length - nc, trait = res === 1, porte = dansPorte(k.c, k.r);
    const coeur = porte && [-1, 0, 1].every(dx => [-1, 0, 1].every(dy => dansPorte(k.c + dx, Math.min(p.rows - 1, k.r + dy))));
    t = trait ? `Sous ta carte : <b>${nc}</b> clair${s_(nc)} ☐ et <b>${ns}</b> sombre${s_(ns)} ■ → les deux couleurs → <b>un trait</b> ✏️`
              : `Sous ta carte : ${nc ? 'que du clair ☐' : 'que du sombre ■'} → une seule couleur → <b>rien</b>`;
    if (trait && !porte && Math.abs(k.c - PORTE.c0) > 1) t += '<br>😮 Un trait loin de la porte : ta carte est <b>trop grande</b> !';
    else if (trait && coeur) t += '<br>😮 Le trait recouvre le milieu de la porte : ta carte est <b>trop grande</b> !';
    else if (trait) t += '<br>🚪 C\'est le bord de la porte secrète !';
    else if (coeur) t += '<br>👍 Le milieu de la porte reste libre : on pourra passer !';
    else t += '<br>👍 Ici, le mur est tout pareil.';
  }
  return (bon ? '✔ Bravo ! ' : '✘ Pas tout à fait… ') + t;
}

/* ---------- Ouvrir, changer d'étape, finir (appelées par pieges.js) ---------- */
function ouvrirAtelier(p) {
  const total = p.cols * p.rows;
  Object.assign(p.anim, { manuel: true, fait: new Uint8Array(total), quand: new Float64Array(total), nFait: 0, auto: false, sonT: 0, serie: 0, nBons: 0, nQ: 0 });
  atelierFin = null; atelierCam = { x: camX, depart: camX };
  debutEtape(p); Son.jouer('carte');
}
const DEBUT_ETAPE = {
  trou: ['🧱 Ta carte va remplir le trou. Elle s\'arrête sur chaque case du trou : à toi de jouer !', '🧹 Étape 2 : maintenant, on enlève les briques qui dépassent.'],
  buisson: ['✂️ Ta carte va couper les branches fines. Elle s\'arrête sur chaque branche !', '🌱 Étape 2 : la grosse voûte repousse un peu.'],
  sable: ['🌫️ Ta carte va mélanger le sable. Regarde bien les couleurs !'],
  tornade: ['🌀 Ta carte va calmer la tornade. Attention à l\'œil, au milieu : il doit rester noir !'],
  brouillard: ['🔎 Ta carte va chasser le brouillard : derrière, il y a des lanternes 🏮 et des poteaux 🪵.'],
  mur: ['✏️ La porte secrète est un peu plus sombre que le mur. Ta carte cherche son bord : là où le clair touche le sombre !']
};
function debutEtape(p) {
  const a = p.anim;
  Object.assign(a, { cles: clesPour(p, a.ph), q: 0, pos: 0, derCol: -1, mode: 'glisse' });
  elAtChoix.hidden = true; elAtQ.className = '';
  elAtQ.innerHTML = (DEBUT_ETAPE[p.type] || [])[a.ph] || '👀 Ta carte avance…';
}
function atelierNouvelleEtape(p) { const a = p.anim; a.fait.fill(0); a.quand.fill(0); a.nFait = 0; debutEtape(p); Son.jouer('carte'); }
function finAtelier(p, ok) {
  const ph = p.phases[p.phases.length - 1], a = p.anim;
  atelierFin = { p, ok, sortie: ph.sortie, op: ph.op, r: rangeeCle(p, p.phases.length - 1), jusqua: performance.now() + 1800 };
  elAtChoix.hidden = true; elAtQ.className = ok ? 'bon' : 'faux';
  elAtQ.innerHTML = (ok ? '🎉 Réussi ! C\'est toi qui as fait le travail de la carte !' : '😮 Raté : ce n\'était pas la bonne taille de carte. Essaie une autre carte !') + (a.nQ ? `<br>Bonnes réponses : <b>${a.nBons}/${a.nQ}</b>` : '');
  atelierCam = null;
}
function repondre(j) {
  const p = pieceAtelier(); if (!p || p.anim.mode !== 'question' || jeuEnPause()) return;
  const a = p.anim, ph = p.phases[a.ph], k = a.cles[a.q], i = k.r * p.cols + k.c, ch = a.choix[j]; if (!ch) return;
  const vrai = verite(p, ph, i), bon = memeValeur(ch.v, vrai);
  a.serie = bon ? a.serie + 1 : 0; a.nQ++; if (bon) a.nBons++;
  Object.assign(a, { mode: 'reponse', bon, repT: performance.now() });
  passerColonne(p, k.c);
  [...elAtChoix.children].forEach((b, q) => { b.disabled = true; b.classList.toggle('bon', memeValeur(a.choix[q].v, vrai)); b.classList.toggle('faux', q === j && !bon); });
  elAtQ.className = bon ? 'bon' : 'faux'; elAtQ.innerHTML = expliquerReponse(p, bon);
  Son.jouer(bon ? 'piece' : 'echec');
}
elAtChoix.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { repondre(+b.dataset.j); b.blur(); } });
addEventListener('keydown', e => {                           // ← → ↓ : répondre au clavier (atelier.js est chargé avant jeu.js : le prince ne bouge pas)
  const p = pieceAtelier(); if (!p || p.anim.mode !== 'question' || jeuEnPause()) return;
  const j = { ArrowLeft: 0, ArrowRight: 1, ArrowDown: 2 }[e.key]; if (j === undefined) return;
  e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) repondre(j);
});

/* ---------- La carte construit : toute une colonne d'un coup ---------- */
function passerColonne(p, c) {
  const a = p.anim, ph = p.phases[a.ph], now = performance.now(), vis = lignesVisibles(p);
  let change = false;
  for (let r = 0; r < vis; r++) { const i = r * p.cols + c; if (!a.fait[i]) { a.fait[i] = 1; a.nFait++; a.quand[i] = now; if (!memeValeur(ph.entree[i], ph.sortie[i])) change = true; } }
  if (now - a.sonT > 60) { a.sonT = now; Son.jouer(change ? 'bloc' : 'tick'); }
}
/* Appelée à chaque image par avancerAnim (pieges.js) : renvoie true quand l'étape est finie */
function majAtelier(p, dt) {
  const a = p.anim, now = performance.now(), vis = lignesVisibles(p);
  if (a.mode === 'question') return false;
  if (a.mode === 'reponse') {
    const k = a.cles[a.q], ph = p.phases[a.ph], nb = Math.min(12, voisinsDe(ph.entree, p.cols, p.rows, k.c, k.r, tailleDe(ph.op, a.n)).filter(v => compte(p, ph.op, v)).length);
    const tenir = (nb + 1) * PAS_COMPTE + (a.bon ? (a.serie >= 3 ? 200 : 420) : 1600);   // juste et en série : on file
    if (now - a.repT < tenir) return false;
    a.q++; a.mode = 'glisse'; elAtChoix.hidden = true;
  }
  const cible = a.q < a.cles.length ? a.cles[a.q].c : p.cols + 1.5;
  a.pos = Math.min(cible, a.pos + VAGUE * dt);
  const c = Math.min(p.cols - 1, Math.floor(a.pos - (a.q < a.cles.length ? 0.001 : 0)));
  for (let k = a.derCol + 1; k <= c; k++) if (a.q >= a.cles.length || k < a.cles[a.q].c) { passerColonne(p, k); a.derCol = k; }
  if (a.q < a.cles.length && a.pos >= cible) { a.pos = cible; poserQuestion(p); return false; }
  return a.q >= a.cles.length && a.nFait >= vis * p.cols && a.pos >= p.cols + 1.5;
}
function tenirCamera(p, dt) {                                  // on décale la vue pour que le piège ne soit pas caché par la loupe
  if (!atelierCam) return;
  const voulu = Math.max(atelierCam.depart, Math.min(p.x + p.l + 20 - W * 0.66, heros.x - 70));
  atelierCam.x += (voulu - atelierCam.x) * Math.min(1, dt * 5); camX = Math.max(0, atelierCam.x);
}
function texteAtelier(p) {
  const a = p.anim;
  if (a.pause > 0 || !a.cles) return '';
  if (a.mode === 'question') return `❓ Question ${a.q + 1} sur ${a.cles.length} : regarde la loupe à droite →`;
  return '';
}

/* ---------- Ce que la carte voit : la même scène, dans le jeu ET dans la loupe ---------- */
function scene(g, p, c0, r0, X, Y, s, alpha, fond = 1) {          // fond < 1 : dans le jeu, on voit le vrai piège se construire à travers
  const a = p.anim, ph = p.phases[a.ph], nn = tailleDe(ph.op, a.n), R = (nn - 1) / 2, now = performance.now(), i0 = r0 * p.cols + c0;
  const cleIci = a.cles && a.cles[a.q] && a.cles[a.q].c === c0 && a.cles[a.q].r === r0 && (a.mode === 'question' || a.mode === 'reponse');
  const reponse = cleIci && a.mode === 'reponse';
  let n = 0;
  g.save(); g.globalAlpha = alpha;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const c = c0 + dx, r = r0 + dy, x = X(c), y = Y(r), cc = borne(c, 0, p.cols - 1), rr = borne(r, 0, p.rows - 1), v = ph.entree[rr * p.cols + cc];
    g.globalAlpha = alpha * fond; g.fillStyle = couleurAt(p, v, rr); g.fillRect(x + 1, y + 1, s - 2, s - 2); g.globalAlpha = alpha;
    if (!dx && !dy || !reponse) continue;
    if (compte(p, ph.op, v)) {
      n++; const t = now - a.repT - n * PAS_COMPTE;
      if (t > 0) {
        const k = Math.min(1, t / 120);
        g.strokeStyle = '#ffe9a0'; g.lineWidth = Math.max(2, s * 0.09); g.strokeRect(x + 2, y + 2, s - 4, s - 4);
        if (s >= 14) { g.fillStyle = '#ffd166'; g.beginPath(); g.arc(x + s / 2, y + s / 2, s * 0.26 * (1.4 - 0.4 * k), 0, TAU); g.fill();
          g.fillStyle = '#2a1640'; g.font = `700 ${Math.round(s * 0.34)}px 'Baloo 2', system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, x + s / 2, y + s / 2 + 1); }
      }
    } else if ((ph.op === 'maximum' || ph.op === 'minimum') && fond === 1) { g.fillStyle = 'rgba(8,4,20,0.5)'; g.fillRect(x + 1, y + 1, s - 2, s - 2); }
  }
  const xc = X(c0), yc = Y(r0);
  if (cleIci && a.mode === 'question' && (ph.op === 'nettete' || ph.op === 'contour')) {             // Lynx : on garde la couleur de la case (il faut la comparer à ses voisines), avec un petit ❓
    g.fillStyle = couleurAt(p, ph.entree[i0], r0); g.fillRect(xc + 1, yc + 1, s - 2, s - 2);
    g.fillStyle = '#ffd166'; g.font = `700 ${Math.round(s * 0.32)}px 'Baloo 2', system-ui, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText('?', xc + s - 3, yc + 2);
  } else if (cleIci && a.mode === 'question') {
    g.fillStyle = '#2a1650'; g.fillRect(xc + 1, yc + 1, s - 2, s - 2);
    g.fillStyle = '#ffd166'; g.font = `700 ${Math.round(s * 0.62)}px 'Baloo 2', system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', xc + s / 2, yc + s / 2 + 2);
  } else if (fond === 1) { g.fillStyle = couleurAt(p, ph.sortie[i0], r0, ph.op); g.fillRect(xc + 1, yc + 1, s - 2, s - 2); }
  cadreCarte(g, X(c0 - R), Y(r0 - R), nn, s, reponse ? null : ph.op);   // pendant le comptage, on cache les points pour bien voir les numéros
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(xc + 1.5, yc + 1.5, s - 3, s - 3);
  g.restore(); g.textAlign = 'start'; g.textBaseline = 'alphabetic';
}
function cadreCarte(g, x, y, nn, s, op) {
  g.save();
  if (op === 'gauss') {                                          // Berceuse : un point par case, plus gros au milieu = « compte plus »
    const w = noyauGauss(nn), m = Math.max(...w); g.fillStyle = 'rgba(255,244,220,0.7)'; g.strokeStyle = 'rgba(30,15,50,0.8)'; g.lineWidth = 1;
    w.forEach((q, j) => { const rr = Math.max(1.2, s * 0.3 * Math.sqrt(q / m)); g.beginPath(); g.arc(x + (j % nn + 0.5) * s, y + (Math.floor(j / nn) + 0.5) * s, rr, 0, TAU); g.fill(); g.stroke(); });
  } g.strokeStyle = 'rgba(255,233,160,0.45)'; g.lineWidth = 1; g.beginPath();
  for (let k = 1; k < nn; k++) { g.moveTo(x + k * s, y); g.lineTo(x + k * s, y + nn * s); g.moveTo(x, y + k * s); g.lineTo(x + nn * s, y + k * s); }
  g.stroke(); g.strokeStyle = '#ffd166'; g.lineWidth = 3.5; g.shadowColor = '#ffd166'; g.shadowBlur = 10; g.strokeRect(x, y, nn * s, nn * s); g.restore();
}

/* ---------- Dans le VRAI piège ---------- */
function positionCarte(p) {
  const a = p.anim;
  if ((a.mode === 'question' || a.mode === 'reponse') && a.cles[a.q]) return a.cles[a.q];
  return { c: borne(Math.floor(a.pos), 0, p.cols - 1), r: rangeeCle(p, a.ph) };
}
function dessinerEclatsAtelier(p, sx) {
  const a = p.anim, cs = p.cell, vis = lignesVisibles(p), now = performance.now();
  if (a.pause > 0 || !a.cles) return;
  ctx.save(); ctx.beginPath(); ctx.rect(sx, p.y0 - 4, p.l, Math.min(p.zy1, H) - p.y0 + 4); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';                                                                 // chaque colonne construite brille un instant
  for (let c = 0; c < p.cols; c++) { const age = (now - a.quand[c]) / 450; if (a.fait[c] && age < 1) { ctx.fillStyle = `rgba(255,233,160,${0.25 * (1 - age)})`; ctx.fillRect(sx + c * cs, p.y0, cs, vis * cs); } }
  ctx.globalCompositeOperation = 'source-over';
  const k = positionCarte(p);
  if (a.mode === 'question' || a.mode === 'reponse') scene(ctx, p, k.c, k.r, c => sx + c * cs, r => p.y0 + r * cs, cs, 1, a.mode === 'question' ? 0.55 : 0);
  else if (a.pos < p.cols) { const R = (tailleDe(p.phases[a.ph].op, a.n) - 1) / 2; cadreCarte(ctx, sx + (k.c - R) * cs, p.y0 + (k.r - R) * cs, 2 * R + 1, cs, p.phases[a.ph].op); }
  ctx.restore();
}
function briques(x, y, w, h, alpha) {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = deg(ctx, 0, y, 0, y + Math.min(h, 120), [[0, '#e08a48'], [1, '#7a3a18']]); ctx.fillRect(x, y, w + 0.5, h);
  ctx.strokeStyle = 'rgba(40,15,5,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let yy = y + 13.5, j = 0; yy < y + h; yy += 14, j++) { ctx.moveTo(x, yy); ctx.lineTo(x + w, yy);
    for (let xx = x + (j % 2 ? 9 : 0) + 18; xx < x + w; xx += 18) { ctx.moveTo(xx, yy - 14); ctx.lineTo(xx, yy); } }
  ctx.stroke(); ctx.fillStyle = 'rgba(255,220,170,0.45)'; ctx.fillRect(x, y, w, 3);
  ctx.restore();
}
function dessinerTrouAtelier(p, sx) {
  const cs = p.cell, sol = p.rows - 1, now = performance.now(), haut = H - SOL_Y + 3;
  for (let c = 0; c < p.cols; c++) for (let r = 0; r < p.rows; r++) {
    const i = r * p.cols + c, v = valeurCase(p, c, r), x = sx + c * cs, y = p.y0 + r * cs;
    if (r === sol) {
      if (p.g[i]) continue;
      const k = v ? (p.anim.fait[i] ? Math.min(1, (now - p.anim.quand[i]) / 240) : 1) : 0;   // 0 = trou noir, 1 = mortier jusqu'en haut
      if (k < 1) { ctx.fillStyle = deg(ctx, 0, SOL_Y, 0, H, [[0, '#04050c'], [1, '#000']]); ctx.fillRect(x - 0.5, SOL_Y - 3, cs + 1, haut); }
      if (k > 0) briques(x, H - haut * k, cs, haut * k, 1);
    } else if (v) briques(x, y, cs, cs, 0.7);                                     // la terre déborde au-dessus du sol (étape 1), puis repart (étape 2)
  }
}

/* ---------- La LOUPE (fenêtre de droite) ---------- */
function dessinerAtelier(p) {
  const a = p.anim; if (!a.cles) return;
  const ph = p.phases[a.ph], nn = tailleDe(ph.op, a.n), F = FILTRES_JEU[p.outil], k = positionCarte(p), R = (nn - 1) / 2;
  ac.clearRect(0, 0, AT_L, AT_H);
  const s = Math.min(40, Math.floor(196 / nn)), bloc = s * nn, X0 = 14 + Math.round((196 - bloc) / 2), Y0 = Math.round((AT_H - bloc) / 2);
  scene(ac, p, k.c, k.r, c => X0 + (c - k.c + R) * s, r => Y0 + (r - k.r + R) * s, s, 1);
  const xr = 236, yc = AT_H / 2, i0 = k.r * p.cols + k.c, montre = a.mode !== 'question', w2 = 50;   // à droite : → et la grande case réponse
  ac.fillStyle = '#ffd166'; ac.font = "700 30px 'Baloo 2', system-ui, sans-serif"; ac.textAlign = 'center'; ac.textBaseline = 'middle'; ac.fillText('→', xr - 14, yc);
  ac.fillStyle = montre ? couleurAt(p, ph.sortie[i0], k.r, ph.op) : '#2a1650'; ac.fillRect(xr + 4, yc - w2 / 2, w2, w2);
  ac.strokeStyle = a.mode === 'reponse' ? (a.bon ? '#8ff0c0' : '#ff9aa8') : '#fff4dc'; ac.lineWidth = 3; ac.strokeRect(xr + 4, yc - w2 / 2, w2, w2);
  if (!montre) { ac.fillStyle = '#ffd166'; ac.font = "700 34px 'Baloo 2', system-ui, sans-serif"; ac.fillText('?', xr + 4 + w2 / 2, yc + 2); }
  ac.textAlign = 'start'; ac.textBaseline = 'alphabetic';
  const etapes = p.phases.length;
  elAtTitre.textContent = `${F.icone} ${F.nom} · ${({ 3: 'Petite', 5: 'Moyenne', 7: 'Suprême' })[a.n]}` + (etapes > 1 ? ` · ${a.ph + 1}/${etapes}` : '') + (a.cles.length ? ` · ❓${Math.min(a.q + 1, a.cles.length)}/${a.cles.length}` : '');
  elAtProgres.style.width = (100 * (a.ph + a.nFait / (lignesVisibles(p) * p.cols)) / etapes) + '%';
}
function dessinerAtelierFin() {
  const f = atelierFin, p = f.p, s = Math.min(34, Math.floor(260 / p.cols)), x0 = (AT_L - s * p.cols) / 2, y0 = 60;
  ac.clearRect(0, 0, AT_L, AT_H);
  for (let c = 0; c < p.cols; c++) { ac.fillStyle = couleurAt(p, f.sortie[f.r * p.cols + c], f.r, f.op); ac.fillRect(x0 + c * s + 1, y0, s - 2, s); }
  ac.textAlign = 'center'; ac.textBaseline = 'middle'; ac.font = "700 64px 'Baloo 2', system-ui, sans-serif";
  ac.fillStyle = f.ok ? '#8ff0c0' : '#ff9aa8'; ac.fillText(f.ok ? '✔' : '✘', AT_L / 2, 160); ac.textAlign = 'start'; ac.textBaseline = 'alphabetic';
  elAtProgres.style.width = '100%';
}
function boucleAtelier() {
  const p = pieceAtelier(), fin = !p && atelierFin && performance.now() < atelierFin.jusqua, visible = !!p || !!fin;
  elAtelier.classList.toggle('ouvert', visible); document.body.classList.toggle('atelier-ouvert', !!p);
  if (p) dessinerAtelier(p); else if (fin) dessinerAtelierFin();
  requestAnimationFrame(boucleAtelier);
}
requestAnimationFrame(boucleAtelier);
