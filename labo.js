/* =====================================================
   ÉTAPE 5 : LA LOUPE MAGIQUE (laboratoire)
   On voit la fenêtre glisser case par case sur une petite image, le calcul de la case courante,
   et le résultat qui se construit à droite. Le moteur de calcul est dans convolution.js.
   ===================================================== */
let laboOuvert = false;                  // le jeu se met en pause quand c'est vrai (voir update() dans jeu.js)
let tailleFenetre = 3;                   // taille de la fenêtre magique : 3, 5 ou 7 (servira aussi dans le jeu)
const VITESSES = [6, 20, 60];            // cases par seconde : lent, normal, rapide
const LAB_L = 900, LAB_H = 430, CS = 22, GX1 = 70, GX2 = 490, GY = 72;   // dimensions du dessin et des grilles

const elLabo = document.getElementById('labo');
const laboCanvas = document.getElementById('labo-canvas'), lc = laboCanvas.getContext('2d');
const elLaboTexte = document.getElementById('labo-texte'), elLaboResultat = document.getElementById('labo-resultat');
const labo = { filtre: 'flou', ech: null, phases: [], p: 0, i: 0, acc: 0, attente: 0, jouer: true, vitesse: 1, defi: null, defiNum: -1, attendre: false, bons: 0, essais: 0 };

const TEXTES = {
  flou: ["La matrice du filtre (en bleu) met un poids de 1/9 sur chaque case. On multiplie chaque case par son poids, puis on additionne : on obtient la moyenne des couleurs. C'est ça, une convolution !"],
  ouverture: ["Étape 1 : rétrécir. On multiplie par la matrice (que des 1) et on additionne. Si la somme est égale au nombre de cases de la matrice, toutes les cases sont pleines : la case reste pleine. Les petits buissons disparaissent.",
              "Étape 2 : grossir. Même calcul (matrice de 1, on additionne) : si la somme est d'au moins 1, la case devient pleine. Ce qui a survécu retrouve sa taille."],
  fermeture: ["Étape 1 : grossir. On multiplie par la matrice (que des 1) et on additionne : si la somme est d'au moins 1, la case devient pleine. Les trous se rebouchent.",
              "Étape 2 : rétrécir. Même calcul : la case reste pleine seulement si la somme est égale au nombre de cases de la matrice. Le chemin retrouve sa forme, sans les trous."]
};

// Les défis : un obstacle, et l'enfant doit choisir la bonne carte (petite 3×3, moyenne 5×5 ou suprême 7×7)
const DEFIS = [{ type: 'fermeture', large: 2 }, { type: 'fermeture', large: 4 }, { type: 'fermeture', large: 6 },
               { type: 'ouverture', tige: 1, epais: 3 }, { type: 'ouverture', tige: 3, epais: 5 }];
const plusPetite = ok => [3, 5, 7].find(ok) || 7;       // la plus petite carte pour laquelle ok(n) est vrai

// Les petites images de test (16 × 10 cases). Pour les masques : 1 = plein, 0 = vide.
function echantillon(type, d) {
  const w = 16, h = 10, g = new Array(w * h).fill(0), mettre = (x, y, v) => g[y * w + x] = v;
  if (type === 'flou') {                                   // du sable : deux couleurs bien mélangées
    const r = rng(3);
    for (let i = 0; i < g.length; i++) g[i] = r() < 0.5 ? [242, 213, 138] : [138, 90, 43];
    return { w, h, g, rgb: true };
  }
  if (type === 'ouverture') {                              // une grosse voûte (épaisseur E) et des petits buissons isolés (largeur T)
    const E = d ? d.epais : 4, T = d ? d.tige : 1;
    for (let y = d ? 1 : 3; y < (d ? 1 : 3) + E; y++) for (let x = d ? 4 : 5; x <= (d ? 12 : 11); x++) mettre(x, y, 1);
    (d ? [[0, 0], [13, 0], [0, 7], [13, 7], [7, 7]] : [[2, 1], [14, 2], [3, 8], [13, 8], [14, 8], [8, 9]]).forEach(([x, y]) => { for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) mettre(x + i, y + j, 1); });
    return { w, h, g, plein: '#2f9e5a', vide: '#d9b77a', obst: { tige: T, epais: E } };
  }
  const L = d ? d.large : 5;                               // fermeture : un chemin de terre avec un gros trou (largeur L) et des petits trous
  for (let y = 4; y <= 9; y++) for (let x = 0; x < w; x++) mettre(x, y, 1);
  for (let y = 5; y <= 8; y++) for (let x = 5; x < 5 + L; x++) mettre(x, y, 0);
  [[2, 6], [13, 7], [14, 5]].forEach(([x, y]) => mettre(x, y, 0));
  return { w, h, g, plein: '#8a5a3a', vide: '#2a1b4a', obst: { large: L } };
}

// Prépare TOUT le calcul d'avance ; l'animation ne fait que le révéler case par case
function laboPreparer(type, attendre = false) {
  labo.filtre = type; labo.ech = echantillon(type, labo.defi && labo.defi.type === type ? labo.defi : null); labo.phases = [];
  let entree = labo.ech.g;
  FILTRES[type].forEach(op => {
    const sortie = balayer(entree, labo.ech.w, labo.ech.h, tailleFenetre, op);
    labo.phases.push({ op, entree, sortie }); entree = sortie;   // la sortie d'une étape devient l'entrée de la suivante
  });
  Object.assign(labo, { p: 0, i: 0, acc: 0, attente: 0, jouer: true });
  elLaboResultat.textContent = ''; labo.attendre = attendre; majTexteLabo();
  if (attendre) { labo.jouer = false; elLaboTexte.textContent = questionDefi(); }       // le défi attend que l'enfant choisisse sa carte
  majBoutonsLabo();
}
function questionDefi() {
  const o = labo.ech.obst;
  return labo.filtre === 'fermeture' ? `Défi : ce trou fait ${o.large} cases. Quelle carte choisis-tu pour le boucher ? Clique sur Petite, Moyenne ou Suprême.`
    : `Défi : les petites tiges font ${o.tige} case${o.tige > 1 ? 's' : ''} et la voûte ${o.epais}. Quelle carte efface les tiges sans effacer la voûte ? Clique sur Petite, Moyenne ou Suprême.`;
}
function majTexteLabo() { elLaboTexte.textContent = TEXTES[labo.filtre][labo.p]; }
function majBoutonsLabo() {
  elLabo.querySelectorAll('[data-filtre]').forEach(b => b.setAttribute('aria-pressed', b.dataset.filtre === labo.filtre));
  elLabo.querySelectorAll('[data-taille]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.taille === tailleFenetre));
  document.getElementById('lab-jouer').textContent = labo.jouer ? '⏸ Pause' : '▶ Lecture';
  document.getElementById('lab-vitesse').textContent = '⏩ ' + ['Lent', 'Normal', 'Rapide'][labo.vitesse];
}

// Le message final : il compare la taille de la carte à celle de l'obstacle, avec les mots de l'enfant
function messageFinal() {
  const n = tailleFenetre, o = labo.ech.obst, c = nomCarte(n);
  if (labo.filtre === 'flou') return "Les couleurs sont mélangées : le sable est devenu de la terre ! (Ici, n'importe quelle carte marche.)";
  let texte, parfait = false;
  if (labo.filtre === 'fermeture') {
    const min = plusPetite(k => k > o.large);
    if (n <= o.large) texte = `✘ Le trou est encore là : ta ${c} fait ${n} cases, le trou en fait ${o.large}. La carte doit être plus grande que le trou !`;
    else if (n === min) { texte = `✔ Le trou est bouché ! Ta ${c} (${n}) est plus grande que le trou (${o.large}) : bien choisi, c'est la plus petite qui suffit.`; parfait = true; }
    else texte = `✔ Le trou est bouché, mais la ${nomCarte(min)} suffisait : une plus petite carte coûte moins de pièces.`;
  } else {
    const min = plusPetite(k => k > o.tige);
    if (n <= o.tige) texte = `✘ Les tiges sont toujours là : ta ${c} (${n}) n'est pas plus grande qu'elles (${o.tige}). Elle passe entre les tiges.`;
    else if (n > o.epais) texte = `✔ Les tiges ont disparu… mais la voûte aussi ! Ta ${c} (${n}) est plus grande que la voûte (${o.epais}). Une carte plus petite garderait le tunnel.`;
    else { texte = `✔ Les tiges ont disparu et la voûte est restée : un passage s'ouvre ! Ta ${c} est plus grande que les tiges (${o.tige}) mais pas que la voûte (${o.epais}).`; parfait = n === min; }
  }
  if (labo.defi) { labo.essais++; if (parfait) labo.bons++; texte += `  (Défis réussis du premier coup : ${labo.bons}/${labo.essais})`; }
  return texte;
}

function etapeSuivante() { labo.p++; Object.assign(labo, { i: 0, acc: 0, attente: 0 }); majTexteLabo(); }
function avancer() {                                       // la fenêtre passe à la case suivante
  const total = labo.ech.w * labo.ech.h;
  if (labo.i < total) labo.i++;
  if (labo.i >= total) {
    if (labo.p < labo.phases.length - 1) labo.attente = 1.3;                 // petite pause pour admirer l'étape terminée
    else { labo.jouer = false; elLaboResultat.textContent = messageFinal(); majBoutonsLabo(); }
  }
}
function majLabo(dt) {                                     // appelée à chaque image tant que le labo est ouvert
  const total = labo.ech.w * labo.ech.h;
  if (labo.attente > 0) { if (labo.jouer) { labo.attente -= dt; if (labo.attente <= 0) etapeSuivante(); } }
  else if (labo.jouer && labo.i < total) {
    labo.acc += dt * VITESSES[labo.vitesse];
    while (labo.acc >= 1 && labo.i < total && labo.attente <= 0) { labo.acc -= 1; avancer(); }
  }
  dessinerLabo();
}

function couleurCase(v) { return labo.ech.rgb ? `rgb(${v[0]},${v[1]},${v[2]})` : (v ? labo.ech.plein : labo.ech.vide); }
function carre(x, y, taille, couleur) {
  lc.fillStyle = couleur; lc.fillRect(x, y, taille, taille);
  lc.strokeStyle = '#fff4dc'; lc.lineWidth = 2; lc.strokeRect(x, y, taille, taille);
}
function dessinerLabo() {
  const { w, h } = labo.ech, ph = labo.phases[labo.p], n = tailleFenetre, r = (n - 1) / 2, fini = labo.i >= w * h;
  lc.clearRect(0, 0, LAB_L, LAB_H);
  lc.textBaseline = 'alphabetic'; lc.fillStyle = '#fff4dc'; lc.font = "600 22px 'Baloo 2', system-ui, sans-serif";
  lc.fillText('Avant' + (labo.phases.length > 1 ? ` (étape ${labo.p + 1} sur ${labo.phases.length})` : ''), GX1, 48);
  lc.fillText('Après', GX2, 48);
  lc.fillStyle = '#ffd166'; lc.font = "600 44px 'Baloo 2', system-ui, sans-serif"; lc.fillText('→', 436, GY + 125);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x;
    lc.fillStyle = couleurCase(ph.entree[k]); lc.fillRect(GX1 + x * CS, GY + y * CS, CS - 1, CS - 1);
    lc.fillStyle = k < labo.i ? couleurCase(ph.sortie[k]) : 'rgba(255,255,255,0.08)'; lc.fillRect(GX2 + x * CS, GY + y * CS, CS - 1, CS - 1);
  }
  if (fini || labo.attendre) return;
  const x = labo.i % w, y = Math.floor(labo.i / w), gx = GX1 + (x - r) * CS, gy = GY + (y - r) * CS, t = n * CS;
  dessinerMatrice(gx, gy, n, CS, ph.op, 1, lc);                                              // la matrice du filtre, colorée, avec ses poids
  lc.strokeStyle = '#b5654f'; lc.lineWidth = 6; lc.lineCap = 'round';                         // le manche de la loupe
  lc.beginPath(); lc.moveTo(gx + t, gy + t); lc.lineTo(gx + t + 16, gy + t + 16); lc.stroke();
  lc.strokeStyle = '#ffd166'; lc.lineWidth = 3; lc.strokeRect(GX2 + x * CS - 1, GY + y * CS - 1, CS + 1, CS + 1);   // case en cours de calcul

  // Le calcul de la case courante : pixels × matrice = somme, puis le seuil, puis le nouveau pixel
  const vois = voisinsDe(ph.entree, w, h, x, y, n), s = n === 3 ? 22 : n === 5 ? 18 : 14, y0 = 332, res = ph.sortie[labo.i], op = ph.op, col = COULEUR_OP[op];
  const xP = 70, xM = xP + n * s + 46, xT = xM + n * s + 44;
  lc.textBaseline = 'alphabetic'; lc.textAlign = 'left'; lc.font = "600 17px 'Baloo 2', system-ui, sans-serif";
  lc.fillStyle = '#ffd166'; lc.fillText('Pixels', xP, y0 - 10);
  lc.fillStyle = `rgb(${col})`; lc.fillText(op === 'moyenne' ? `Matrice (1/${n * n} partout)` : 'Matrice (que des 1)', xM, y0 - 10);
  vois.forEach((v, j) => {
    const px = xP + (j % n) * s, py = y0 + Math.floor(j / n) * s;
    lc.fillStyle = couleurCase(v); lc.fillRect(px, py, s - 2, s - 2);
  });
  lc.fillStyle = '#ffd166'; lc.font = "700 30px 'Baloo 2', system-ui, sans-serif"; lc.fillText('×', xP + n * s + 14, y0 + n * s / 2 + 10); lc.fillText('=', xT - 30, y0 + n * s / 2 + 10);
  dessinerMatrice(xM, y0, n, s, op, 1, lc);
  lc.fillStyle = '#fff4dc'; lc.font = "600 19px 'Baloo 2', system-ui, sans-serif";
  if (op === 'moyenne') { lc.fillText('Somme = la moyenne des ' + n * n + ' couleurs', xT, y0 + 26); }
  else {
    const nb = vois.filter(v => v === 1).length, bon = op === 'minimum' ? nb === n * n : nb >= 1;
    lc.fillText(`Somme = ${nb}`, xT, y0 + 22);
    lc.fillStyle = '#ffe9a0'; lc.fillText(op === 'minimum' ? `Pleine si somme = ${n * n} ?` : 'Pleine si somme ≥ 1 ?', xT, y0 + 50);
    lc.fillStyle = bon ? '#8ff0c0' : '#ff9aa8'; lc.fillText(bon ? 'oui → pleine' : 'non → vide', xT, y0 + 78);
  }
  lc.fillStyle = '#ffd166'; lc.font = "700 34px 'Baloo 2', system-ui, sans-serif"; lc.fillText('→', 735, y0 + 40); carre(790, y0 + 12, 50, couleurCase(res));
}

function basculerLabo() {
  laboOuvert = !laboOuvert;
  elLabo.classList.toggle('ouvert', laboOuvert);
  if (laboOuvert) { labo.defi = null; laboPreparer(FILTRES[outilActif] ? outilActif : labo.filtre); }   // on part de l'outil choisi dans le jeu
  majOutils();
  if (typeof majAccueil === 'function') majAccueil();      // si on vient de l'accueil, il se rouvre quand on ferme la loupe
}
function pauseOuRejouer() {
  const fini = labo.i >= labo.ech.w * labo.ech.h && labo.p === labo.phases.length - 1;
  if (fini) laboPreparer(labo.filtre); else { labo.jouer = !labo.jouer; majBoutonsLabo(); }
}
function pasAPas() {
  labo.jouer = false;
  if (labo.attente > 0) etapeSuivante(); else if (labo.i < labo.ech.w * labo.ech.h) avancer();
  majBoutonsLabo();
}

elLabo.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.filtre) { labo.defi = null; outilActif = b.dataset.filtre; majOutils(); laboPreparer(b.dataset.filtre); }   // reste synchronisé avec le jeu
  else if (b.dataset.taille) { tailleFenetre = +b.dataset.taille; laboPreparer(labo.filtre); majFenetre(); }      // (si un défi attendait la carte, il démarre)
  else if (b.dataset.action === 'defi') { labo.defiNum = (labo.defiNum + 1) % DEFIS.length; labo.defi = DEFIS[labo.defiNum]; outilActif = labo.defi.type; majOutils(); laboPreparer(labo.defi.type, true); }
  else if (b.dataset.action === 'jouer') pauseOuRejouer();
  else if (b.dataset.action === 'pas') pasAPas();
  else if (b.dataset.action === 'rejouer') laboPreparer(labo.filtre);
  else if (b.dataset.action === 'vitesse') { labo.vitesse = (labo.vitesse + 1) % VITESSES.length; majBoutonsLabo(); }
  else if (b.dataset.action === 'fermer') basculerLabo();
  b.blur();
});
addEventListener('keydown', e => {                         // V = ouvrir/fermer, Échap = fermer, Espace = pause, → = pas à pas
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'v') basculerLabo();
  else if (laboOuvert) { if (k === 'escape') { basculerLabo(); e.escUtilise = true; } else if (k === ' ') pauseOuRejouer(); else if (k === 'arrowright') pasAPas(); }
});