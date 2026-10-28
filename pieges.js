/* =====================================================
   LES PIÈGES : sable mouvant, trou, buisson épineux
   Un piège = une petite grille de cases (g) sur laquelle on applique une VRAIE convolution
   (balayer, dans convolution.js), case par case, sous les yeux du joueur.
     - sable   : flou (moyenne) -> les grains se mélangent, le sable devient de la terre
     - trou    : fermeture (grossir puis rétrécir) -> un trou plus étroit que la fenêtre se rebouche,
                 et il reste une CICATRICE visible : un pavage scellé par une rune
     - buisson : ouverture (rétrécir puis grossir) -> les tiges épineuses (fines) disparaissent, la voûte
                 (épaisse) reste : on obtient un TUNNEL sous lequel le prince passe en s'accroupissant
   Sans les lunettes, le sable et le trou sont camouflés. Les épines du buisson font perdre une vie.
   La liste des pièges vient du niveau (PIEGES, voir niveaux.js).
   ===================================================== */
let PIEGES = [];

const OUTILS_PIEGE = {};                                // nom, icône et touche de chaque filtre : ils viennent de filtres.js
Object.keys(FILTRES_JEU).forEach(k => { const F = FILTRES_JEU[k]; OUTILS_PIEGE[k] = { nom: F.art + F.nom, court: F.nom, icone: F.icone, touche: F.touche }; });
const TYPES = {
  sable: { nom: 'Sable mouvant', quoi: 'le sable', outil: 'flou', cell: 8, cols: 30, rows: 6, vit: 40,
           indice: "Le sol scintille bizarrement… Mets tes lunettes (touche L) pour voir !",
           mort: "Aïe ! Tu t'es enfoncé dans le sable. Mets tes lunettes (L), choisis la Brume (1), puis appuie sur E !",
           succes: "Le sable est devenu de la terre solide : tu peux passer !" },
  trou:  { nom: 'Trou', quoi: 'ce trou', outil: 'fermeture', cell: 54, cols: 10, rows: 5, vit: 11,
           indice: "Le chemin a l'air étrange… Mets tes lunettes (touche L) pour voir !",
           mort: "Aïe, tu es tombé ! Lunettes (L), Mortier (3), une grande carte (à gauche), puis E !",
           succes: "Le trou est bouché : un pavage scellé par une rune marque l'endroit !",
           echec: "Le trou est encore là : la carte est trop petite. Change-la (cartes à gauche ou touche T) et réessaie !" },
  buisson: { nom: 'Buisson épineux', quoi: 'ce buisson', outil: 'ouverture', cell: 54, cols: 11, rows: 8, vit: 13, visible: true, mort: '',
           indice: "Un énorme buisson épineux barre la route ! Mets tes lunettes (touche L) pour voir comment le franchir.",
           epinesTexte: "Aïe ! Les épines ! Utilise la Faucille (2) pour ouvrir un passage dans le buisson.",
           baisseTexte: "Le passage est bas : accroupis-toi (touche ↓ ou S) pour passer dessous !",
           succes: "Le buisson a disparu : le chemin est libre !",
           tunnelTexte: "Un passage est ouvert ! Accroupis-toi (↓ ou S) pour passer dessous.",
           echec: "Les tiges sont encore là : la carte est trop petite. Change-la (cartes à gauche ou touche T) et réessaie !" }
};
/* ---------- Les variantes de pièges, une ambiance par niveau (même mécanique, autre décor et autres mots) ---------- */
const SKINS = {
  // sable (flou) : grains = les deux couleurs mélangées
  poussiere: { nom: 'Poussière de fée', quoi: 'la poussière', grains: [[255, 196, 240], [112, 72, 196]], indiceTexte: "La poussière brille bizarrement… Mets tes lunettes (touche L) pour voir !",
               mort: "Aïe ! Tu t'es enfoncé dans la poussière enchantée. Lunettes (L), Brume (1), puis E !", succes: "La poussière s'est posée : le sol est solide !" },
  vase:      { nom: 'Vase mouvante', quoi: 'la vase', grains: [[128, 140, 84], [40, 46, 34]], indiceTexte: "La vase fait des bulles bizarres… Mets tes lunettes (touche L) pour voir !",
               mort: "Aïe ! La vase t'a avalé. Lunettes (L), Brume (1), puis E !", succes: "La vase est devenue de la terre ferme : tu peux passer !" },
  gravats:   { nom: 'Gravats instables', quoi: 'les gravats', grains: [[160, 150, 176], [58, 50, 72]], indiceTexte: "Le sol a l'air instable… Mets tes lunettes (touche L) pour voir !",
               mort: "Aïe ! Les gravats se sont effondrés. Lunettes (L), Brume (1), puis E !", succes: "Les gravats se sont tassés : le sol est solide !" },
  verre:     { nom: 'Éclats de verre', quoi: 'les éclats de verre', grains: [[255, 156, 206], [70, 112, 236]], indiceTexte: "Des éclats de verre brillent par terre… Mets tes lunettes (touche L) !",
               mort: "Aïe ! Tu t'es enfoncé dans les éclats. Lunettes (L), Brume (1), puis E !", succes: "Les éclats se sont fondus en un sol lisse : tu peux passer !" },
  // trou (fermeture)
  racines:   { nom: 'Gouffre de racines', quoi: 'ce gouffre', indiceTexte: "De grosses racines s'écartent… Mets tes lunettes (touche L) pour voir !",
               mort: "Aïe, tu es tombé dans le gouffre ! Lunettes (L), Mortier (3), une grande carte (à gauche), puis E !", succes: "Les racines ont refermé le gouffre : un sol vivant marque l'endroit !", echec: "Le gouffre est encore là : la carte est trop petite. Change-la (cartes à gauche ou touche T) et réessaie !" },
  planches:  { nom: 'Ponton brisé', quoi: 'ce trou dans le ponton', indiceTexte: "Il manque peut-être des planches… Mets tes lunettes (touche L) pour voir !",
               mort: "Plouf ! Tu es tombé à l'eau. Lunettes (L), Mortier (3), une grande carte (à gauche), puis E !", succes: "Les planches sont revenues : le ponton est réparé !", echec: "Il manque encore des planches : la carte est trop petite. Change-la (cartes à gauche ou touche T) et réessaie !" },
  oubliette: { nom: 'Oubliette', quoi: 'cette oubliette', indiceTexte: "Une trappe a l'air ouverte… Mets tes lunettes (touche L) pour voir !",
               mort: "Aïe, tu es tombé dans l'oubliette ! Lunettes (L), Mortier (3), une grande carte (à gauche), puis E !", succes: "L'oubliette est bouchée : une grille de fer marque l'endroit !", echec: "L'oubliette est encore ouverte : la carte est trop petite. Change-la (cartes à gauche ou touche T) et réessaie !" },
  vitres:    { nom: 'Sol de verre brisé', quoi: 'ce trou dans le sol', indiceTexte: "Le sol de verre est fissuré… Mets tes lunettes (touche L) pour voir !",
               mort: "Le verre a cédé ! Lunettes (L), Mortier (3), une grande carte (à gauche), puis E !", succes: "Le sol de verre est réparé : il brille de mille couleurs !", echec: "Le sol est encore brisé : la carte est trop petite. Change-la (cartes à gauche ou touche T) et réessaie !" },
  // buisson (ouverture) : lTige = les éléments fins, lVoute = la masse épaisse
  ronces:    { nom: 'Ronces enchantées', quoi: 'ces ronces', lTige: 'les tiges', lVoute: 'la voûte de ronces', indiceTexte: "Un mur de ronces barre la route ! Mets tes lunettes (touche L) pour voir comment le franchir.",
               epinesTexte: "Aïe ! Les ronces piquent ! Utilise la Faucille (2) pour ouvrir un passage.", succes: "Les ronces ont disparu : le chemin est libre !", echec: "Les tiges sont encore là : la carte est trop petite. Change-la (cartes à gauche ou touche T) et réessaie !" },
  roseaux:   { nom: 'Mur de roseaux', quoi: 'ce mur de roseaux', lTige: 'les roseaux', lVoute: 'le feuillage', indiceTexte: "Un mur de roseaux barre le ponton ! Mets tes lunettes (touche L) pour voir comment le franchir.",
               epinesTexte: "Aïe ! Les roseaux coupent comme des lames ! Utilise la Faucille (2).", succes: "Les roseaux ont disparu : le chemin est libre !", echec: "Les roseaux sont encore là : la carte est trop petite. Change-la (cartes à gauche ou touche T) et réessaie !" },
  toiles:    { nom: 'Toiles géantes', quoi: 'ces toiles', lTige: 'les fils', lVoute: 'la grande toile', indiceTexte: "De gigantesques toiles d'araignée barrent le couloir ! Mets tes lunettes (touche L).",
               epinesTexte: "Aïe ! Tu es collé dans la toile ! Utilise la Faucille (2) pour couper les fils.", succes: "Les toiles ont disparu : le chemin est libre !", echec: "Les fils sont encore là : la carte est trop petite. Change-la (cartes à gauche ou touche T) et réessaie !" },
  chaines:   { nom: 'Rideau de chaînes', quoi: 'ce rideau de chaînes', lTige: 'les chaînes', lVoute: 'la grosse poutre', indiceTexte: "Un rideau de chaînes barre le passage ! Mets tes lunettes (touche L) pour voir comment le franchir.",
               epinesTexte: "Aïe ! Les chaînes te frappent ! Utilise la Faucille (2).", succes: "Les chaînes ont disparu : le chemin est libre !", echec: "Les chaînes sont encore là : la carte est trop petite. Change-la (cartes à gauche ou touche T) et réessaie !" }
};
let pieges = [], actionAvant = false;
const indicesVus = new Set();                           // les sortes de pièges qu'on a déjà réussis : leurs indications ne reviennent plus (elles ne s'affichent qu'à la 1re apparition)
const elExplication = document.getElementById('explication'); let minuteurExpl;

/* ---------- L'explication qui apparaît après chaque filtre : on compare la taille de la fenêtre à celle de l'obstacle ---------- */
const ligneEx = (nom, n, cl) => `<div class="ex-ligne"><span>${nom}</span>${('<i class="ex-case ' + cl + '"></i>').repeat(n)}</div>`;
function expliquer(p, n, ok) {                          // un seul message court, affiché sous l'écran de jeu
  let titre;
  if (p.type === 'sable') titre = '✔ La Brume a mélangé les grains';
  else if (typeof NOUVEAUX !== 'undefined' && NOUVEAUX[p.type]) titre = ok ? NOUVEAUX[p.type].ok : `✘ Ta ${nomCarte(n)} est ${NOUVEAUX[p.type].echec(p, n)}`;
  else if (p.type === 'trou') titre = ok ? '✔ Le trou est bouché !' : `✘ Ta ${nomCarte(n)} est trop petite`;
  else titre = ok ? (p.tunnel ? '✔ Un passage est ouvert !' : '✔ L\'obstacle a disparu !') : `✘ Ta ${nomCarte(n)} est trop petite`;
  if (ok && p.type !== 'sable') titre += n === tailleMinimale(p) ? ' · bonne taille 👍' : ` · la ${nomCarte(tailleMinimale(p))} suffisait !`;      // on dit si la carte était la plus petite possible
  elExplication.innerHTML = `<h3>${titre}</h3>`; elExplication.classList.toggle('echec', !ok);
  elExplication.classList.add('visible'); clearTimeout(minuteurExpl); minuteurExpl = setTimeout(cacherExplication, 6000);
}
function cacherExplication() { elExplication.classList.remove('visible'); }
elExplication.addEventListener('click', cacherExplication);

/* ---------- Les cases de buisson : feuillage dense + épines, ou tige épineuse ---------- */
const TONS_BUISSON = ['#0d1a08', '#1f3a14', '#355c20', '#56862c', '#86b84a', '#c2e07a'];   // plus clair et plus jaune que le décor : il doit ressortir
const TONS_RONCES = ['#140a28', '#2a1650', '#4a2a90', '#7a4ad0', '#b890ff', '#ffc0f0'];
function nouvelleToile(cell) { const S = Math.round(cell * 1.6), c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d'), S]; }
function spriteBuisson(seed, cell, tons = TONS_BUISSON, epine = '#d8c8a0') {   // une case de végétation épaisse : feuillage dense + épines
  const [c, g, S] = nouvelleToile(cell), r = R(seed + 7); g.lineCap = 'round';
  for (let i = 0; i < 20; i++) {
    const a = r() * Math.PI * 2, d = S * 0.33, l = 9 + r() * 9;
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 2.2; g.beginPath();
    g.moveTo(S / 2 + Math.cos(a) * d * 0.8, S / 2 + Math.sin(a) * d * 0.8); g.lineTo(S / 2 + Math.cos(a) * (d + l), S / 2 + Math.sin(a) * (d + l)); g.stroke();
  }
  feuillage(g, S / 2, S / 2, S * 0.34, S * 0.34, 60, tons, r);
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2, d = S * 0.28;
    g.strokeStyle = epine; g.lineWidth = 1.6; g.beginPath(); g.moveTo(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d); g.lineTo(S / 2 + Math.cos(a) * (d + 8), S / 2 + Math.sin(a) * (d + 8)); g.stroke();
  }
  return c;
}
function spriteTige(seed, cell, tons = TONS_BUISSON, epine = '#d8c8a0') {       // une tige épineuse : fine, tordue, hérissée d'épines
  const [c, g, S] = nouvelleToile(cell), r = R(seed + 3); g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const x0 = S / 2 + (k - 1) * 9, f = g.createLinearGradient(x0 - 4, 0, x0 + 4, 0); f.addColorStop(0, tons[0]); f.addColorStop(1, tons[3]);
    g.strokeStyle = f; g.lineWidth = 6 - k; g.beginPath(); g.moveTo(x0, S);
    let x = x0; for (let y = S; y > 0; y -= 8) { x += (r() - 0.5) * 7; g.lineTo(x, y); } g.stroke();
    for (let y = S - 6; y > 4; y -= 9) { const sg = r() < 0.5 ? -1 : 1; g.strokeStyle = epine; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0 + (r() - 0.5) * 8, y); g.lineTo(x0 + sg * (10 + r() * 7), y - 5); g.stroke(); }
  }
  feuillage(g, S / 2, S * 0.5, S * 0.22, S * 0.4, 18, tons, r);
  return c;
}
function spriteRoseauxVoute(seed, cell) {                                         // un feuillage de roseaux : des lames courbes
  const [c, g, S] = nouvelleToile(cell), r = R(seed + 5); g.lineCap = 'round';
  for (let i = 0; i < 46; i++) { const x = S * (0.1 + 0.8 * r()), y0 = S * (0.9 + 0.1 * r()), h = S * (0.5 + 0.5 * r()), lean = (r() - 0.5) * S * 0.5;
    const f = g.createLinearGradient(0, y0, 0, y0 - h); f.addColorStop(0, '#0e2a22'); f.addColorStop(1, ['#3a8a6a', '#5ab88a', '#2a6a5a'][i % 3]);
    g.strokeStyle = f; g.lineWidth = 2.4 + r() * 2; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + lean * 0.3, y0 - h * 0.6, x + lean, y0 - h); g.stroke(); }
  return c;
}
function spriteRoseauxTige(seed, cell) {                                          // des roseaux : une tige et un épi brun
  const [c, g, S] = nouvelleToile(cell), r = R(seed + 6); g.lineCap = 'round';
  for (let k = 0; k < 3; k++) { const x = S * (0.3 + 0.2 * k) + (r() - 0.5) * 6, top = S * (0.12 + 0.18 * r());
    g.strokeStyle = '#1a3a30'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(x, S); g.quadraticCurveTo(x + 6, S * 0.5, x + (r() - 0.5) * 10, top); g.stroke();
    g.fillStyle = deg(g, x - 5, 0, x + 6, 0, [[0, '#2a1410'], [0.6, '#5a3226'], [1, '#8a5a40']]); g.beginPath(); g.ellipse(x + 1, top + 4, 5, 15, 0, 0, Math.PI * 2); g.fill(); }
  return c;
}
function spriteToile(seed, cell) {                                                // la grande toile : fils radiaux et concentriques, parfois une araignée
  const [c, g, S] = nouvelleToile(cell), r = R(seed + 9);
  g.fillStyle = 'rgba(60,50,80,0.35)'; g.beginPath(); g.ellipse(S / 2, S / 2, S * 0.42, S * 0.42, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(235,230,250,0.75)'; g.lineWidth = 1.4;
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + r() * 0.1; g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + Math.cos(a) * S * 0.48, S / 2 + Math.sin(a) * S * 0.48); g.stroke(); }
  for (let j = 1; j <= 4; j++) { g.beginPath(); for (let k = 0; k <= 12; k++) { const a = k * Math.PI / 6, rr = S * 0.12 * j * (0.9 + r() * 0.2); k ? g.lineTo(S / 2 + Math.cos(a) * rr, S / 2 + Math.sin(a) * rr) : g.moveTo(S / 2 + rr, S / 2); } g.stroke(); }
  if (r() < 0.3) { g.fillStyle = '#0a0612'; g.beginPath(); g.ellipse(S / 2, S / 2, 7, 5, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#0a0612'; g.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { if (!k) continue; g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + k * 8, S / 2 - 8 + Math.abs(k) * 4); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + k * 8, S / 2 + 8 - Math.abs(k) * 4); g.stroke(); } }
  return c;
}
function spriteFils(seed, cell) {                                                 // des fils de soie épais, tendus
  const [c, g, S] = nouvelleToile(cell), r = R(seed + 4); g.lineCap = 'round';
  for (let k = 0; k < 4; k++) { const x = S * (0.22 + 0.19 * k) + (r() - 0.5) * 4; g.strokeStyle = 'rgba(240,236,252,0.85)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, S); g.lineTo(x + (r() - 0.5) * 6, 0); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)'; for (let y = 10; y < S; y += 16) { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); } }
  return c;
}
function spritePoutre(seed, cell) {                                               // une lourde poutre de métal avec ses rivets
  const [c, g, S] = nouvelleToile(cell), h = S * 0.62;
  g.fillStyle = deg(g, 0, S / 2 - h / 2, 0, S / 2 + h / 2, [[0, '#8a8aa0'], [0.4, '#3a3a52'], [1, '#12121e']]); g.fillRect(0, S / 2 - h / 2, S, h);
  g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2; g.strokeRect(0, S / 2 - h / 2, S, h);
  g.fillStyle = '#b8b8cc'; for (let x = 10; x < S; x += 22) { g.beginPath(); g.arc(x, S / 2 - h / 2 + 8, 2.6, 0, Math.PI * 2); g.arc(x, S / 2 + h / 2 - 8, 2.6, 0, Math.PI * 2); g.fill(); }
  return c;
}
function spriteChaine(seed, cell) {                                               // une chaîne qui pend : des maillons
  const [c, g, S] = nouvelleToile(cell);
  for (let k = 0; k < 2; k++) { const x = S * (0.34 + 0.32 * k);
    for (let y = 0, i = 0; y < S; y += 14, i++) { g.strokeStyle = deg(g, x - 7, 0, x + 7, 0, [[0, '#2a2a3a'], [0.5, '#c8c8dc'], [1, '#4a4a5c']]); g.lineWidth = 3.4;
      g.beginPath(); if (i % 2) g.ellipse(x, y + 8, 3, 8, 0, 0, Math.PI * 2); else g.ellipse(x, y + 8, 7, 7.5, 0, 0, Math.PI * 2); g.stroke(); } }
  return c;
}
const ART_BUISSON = {                                                             // l'apparence du buisson selon la variante : voûte, tiges, souches coupées
  epines:  { voute: (s, c) => spriteBuisson(s, c), tige: (s, c) => spriteTige(s, c), souche: ['#1a1208', '#4a3a1c', '#6a5a30'] },
  ronces:  { voute: (s, c) => spriteBuisson(s, c, TONS_RONCES, '#f0d8ff'), tige: (s, c) => spriteTige(s, c, TONS_RONCES, '#f0d8ff'), souche: ['#140a28', '#3a2060', '#7a4ad0'] },
  roseaux: { voute: spriteRoseauxVoute, tige: spriteRoseauxTige, souche: ['#0e2a22', '#2a6a5a', '#5ab88a'] },
  toiles:  { voute: spriteToile, tige: spriteFils, souche: ['#2a2638', '#6a6684', '#c8c4e0'] },
  chaines: { voute: spritePoutre, tige: spriteChaine, souche: ['#1a1a28', '#4a4a62', '#9a9ab4'] }
};

/* ---------- Création des pièges ---------- */
function nouveauPiege(d) {
  if (typeof NOUVEAUX !== 'undefined' && NOUVEAUX[d.type]) return nouveauNouveau(d);          // tornade, porte secrète, brouillard (voir pieges2.js)
  const T = TYPES[d.type], sk = SKINS[d.skin] || {}, cell = T.cell;
  let cols = T.cols, rows = T.rows, zx = d.x, y0 = SOL_Y, zy0 = SOL_Y - 4, zy1 = SOL_Y + rows * cell + 2;
  let large = 0, g, sprites = null, tigesIdx = null, tiges = null, epais = 0, art = null;
  if (d.type === 'sable') {
    g = new Array(cols * rows).fill(0); const r = rng(d.x);
    const gr = sk.grains || [[196, 164, 104], [104, 74, 40]];
    for (let i = 0; i < cols * rows; i++) g[i] = r() < 0.5 ? gr[0] : gr[1];
    var zl = cols * cell;
  } else if (d.type === 'trou') {                       // 0 = vide, 1 = terre. Le sol est la dernière rangée, l'air au-dessus
    large = d.large || 4; cols = large + 6; g = new Array(cols * rows).fill(0);
    for (let c = 0; c < cols; c++) g[(rows - 1) * cols + c] = (c >= 3 && c < 3 + large) ? 0 : 1;
    zx = d.x + 3 * cell; var zl = large * cell; y0 = SOL_Y - (rows - 1) * cell; zy1 = H;
  } else {                                              // buisson : 1 = végétation. Une voûte épaisse + des tiges fines dessous
    const tige = d.tige || 1; epais = d.epais || 3; const span = tige === 1 ? 7 : 11, c0 = 2;
    cols = span + 4; rows = epais + 5; g = new Array(cols * rows).fill(0); tigesIdx = []; tiges = [];
    for (let y = 1; y <= epais; y++) for (let x = c0; x < c0 + span; x++) g[y * cols + x] = 1;                       // la voûte (épaisseur = epais rangées)
    const groupes = tige === 1 ? [0, 2, 4, 6] : [0, 4, 8];                                                           // colonnes de départ des tiges
    groupes.forEach(gc => { tiges.push(c0 + gc + tige / 2);
      for (let k = 0; k < tige; k++) for (const y of [epais + 1, epais + 2]) { g[y * cols + c0 + gc + k] = 1; tigesIdx.push(y * cols + c0 + gc + k); } });
    [[0, epais + 2], [cols - 1, epais + 1]].forEach(([x, y]) => g[y * cols + x] = 1);                                // petites broussailles isolées
    zx = d.x + c0 * cell; var zl = span * cell; y0 = SOL_Y - (epais + 3) * cell; zy0 = y0 + cell - 6; zy1 = SOL_Y + 2;
    const estTige = new Set(tigesIdx);
    art = ART_BUISSON[d.skin] || ART_BUISSON.epines;
    sprites = g.map((v, i) => v ? (estTige.has(i) ? art.tige(d.x + i, cell) : art.voute(d.x + i, cell)) : null);
  }
  return { ...d, ...T, ...sk, g, cols, rows, large, epais, tigesIdx, tiges, art, l: cols * cell, zx, zl, y0, zy0, zy1, sprites,
           etat: 'actif', phases: null, anim: null, sortie: null, indice: false, msgT: -1e9, tunnel: false };
}
function creerPieges() { pieges = PIEGES.map(nouveauPiege); }
function initPieges() { creerPieges(); majFenetre(); }

let tailleFenetre = 3;                                    // la taille de la carte magique choisie : 3 (petite), 5 (moyenne) ou 7 (suprême)
/* ---------- Taille de la fenêtre magique (pastille en haut à droite, ou touche T) ---------- */
function majFenetre() {                                // les 3 cartes de taille (3×3, 5×5, 7×7) : une grille 7×7 avec la fenêtre n×n allumée au centre
  document.querySelectorAll('#fenetres .fen-btn').forEach(b => {
    const n = +b.dataset.n, r = (n - 1) / 2; let html = '';
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) html += (Math.abs(x - 3) <= r && Math.abs(y - 3) <= r) ? '<i class="on"></i>' : '<i></i>';
    b.querySelector('.fen-grille').innerHTML = html; b.setAttribute('aria-pressed', n === tailleFenetre);
    const pc = b.querySelector('.fen-cout'); if (pc) pc.textContent = niveauActuel.entrainement ? 'gratuite' : '🪙 ' + COUT_CARTE[n];      // le prix de la carte
  });
}
function changerTaille() { tailleFenetre = tailleFenetre === 7 ? 3 : tailleFenetre + 2; majFenetre(); Son.jouer('carte'); }
document.getElementById('fenetres').addEventListener('click', e => {      // un clic sur une carte choisit directement sa taille
  const b = e.target.closest('.fen-btn'); if (!b) return;
  tailleFenetre = +b.dataset.n; majFenetre(); Son.jouer('carte'); b.blur();
});
addEventListener('keydown', e => { if (!e.repeat && e.key.toLowerCase() === 't') changerTaille(); });

/* ---------- Lancer le filtre sur un piège ---------- */
const nomCarte = n => n === 3 ? 'petite carte' : n === 5 ? 'carte moyenne' : 'carte suprême';      // la taille de la fenêtre, avec des mots d'enfant
const nomCarteMaj = n => nomCarte(n)[0].toUpperCase() + nomCarte(n).slice(1);
function sautInterdit() { return pieges.some(p => p.etat !== 'resolu' && heros.x > p.zx - 260 && heros.x < p.zx + p.zl + 10); }     // près d'un piège, pas de saut : on ne l'enjambe pas, on utilise sa carte !
function animationEnCours() { return pieges.some(p => p.etat === 'anim'); }
function commencerMarche(p, delai = 0) {                  // le chevalier avance tout seul jusqu'après le piège (s'il s'est trompé, il en subit les conséquences)
  heros.auto = { cible: p.zx + p.zl + 90, apres: performance.now() + delai }; heros.sens = 1;
}
function essayerFiltre(p) {
  if (!lunettes) return montrerBulle("Tu ne vois pas où viser : mets tes lunettes (touche L) !");
  if (!outilActif) return montrerBulle("Choisis d'abord la taille de ta carte (à gauche), puis ton filtre (à droite) !");
  if (outilActif !== p.outil) {                           // mauvais filtre : le chevalier avance quand même, et il en subit les conséquences
    const o = OUTILS_PIEGE[p.outil];
    montrerBulle(`Mauvais filtre pour ${p.quoi} ! Il fallait ${o.nom} ${o.icone}. Le chevalier avance quand même…`);
    Stats.noter({ niv: niveauIdx, piege: pieges.indexOf(p), type: p.type, filtre: outilActif, attendu: p.outil, carte: tailleFenetre, minimale: tailleMinimale(p), ok: false, cause: 'mauvais_filtre' });
    return commencerMarche(p);
  }
  if (!niveauActuel.entrainement) {                     // les cartes se paient : plus elle est grande, plus elle coûte cher
    const cout = COUT_CARTE[tailleFenetre];
    if (nbPieces < cout) { montrerBulle(`Pas assez de pièces : la ${nomCarte(tailleFenetre)} coûte ${cout} 🪙. Les pièces du chemin sont revenues : ramasse-les !`); faireReapparaitre(pieges.indexOf(p)); return; }
    nbPieces -= cout; majPiecesHUD();
  }
  let entree = p.g;                                     // on calcule d'avance chaque étape du filtre (sable : 1 étape, trou et buisson : 2)...
  p.phases = FILTRES[p.outil].map(op => {
    const sortie = balayer(entree, p.cols, p.rows, tailleDe(op, tailleFenetre), op);
    const ph = { op, entree, sortie }; entree = sortie; return ph;
  });
  p.sortie = entree;
  p.anim = { ph: 0, k: 0, acc: 0, pause: 0, n: tailleFenetre, rapide: false }; p.etat = 'anim';   // ...et l'animation les révèle case par case, doucement
}

function avancerAnim(p, dt) {
  const a = p.anim, total = p.cols * p.rows, vis = p.type === 'buisson' ? p.rows - 2 : p.rows;
  if (a.pause > 0) { a.pause -= dt; if (a.pause <= 0) { a.ph++; a.k = 0; a.acc = 0; } return; }
  a.acc += dt * p.vit * (a.rapide ? 4 : 1);               // la vitesse est lente exprès : l'enfant voit chaque pixel changer (E pour accélérer)
  const ph = p.phases[a.ph];
  while (a.k < total) {
    const r = a.k % p.rows, c = Math.floor(a.k / p.rows);
    if (r >= vis) { a.k++; continue; }                    // les cases sous terre : on passe tout de suite
    const vois = voisinsDe(ph.entree, p.cols, p.rows, c, r, tailleDe(ph.op, a.n)), uniforme = !Array.isArray(vois[0]) && vois.every(v => v === vois[0]);
    const cout = uniforme ? 0.2 : 1;                      // un voisinage tout pareil ne changera rien : on le passe plus vite
    if (a.acc < cout) break;
    a.acc -= cout; a.k++; if (!a.rapide) Son.jouer('tick');
  }
  if (a.k < total) return;
  if (a.ph < p.phases.length - 1) { a.pause = 1.0; return; }   // une pause entre les deux étapes, pour comprendre
  const nUtilise = a.n, ok = reussi(p), nMin = tailleMinimale(p); p.vueFin = performance.now();
  Stats.noter({ niv: niveauIdx, piege: pieges.indexOf(p), type: p.type, filtre: p.outil, attendu: p.outil, carte: nUtilise, minimale: nMin, ok, cause: !ok ? (nUtilise > tailleMaximale(p) ? 'echec_trop_grande' : 'trop_petite') : p.type === 'sable' ? 'ok_sable' : nUtilise === nMin ? 'ok_parfait' : 'ok_trop_grande' });       // la vue en pixels s'efface doucement à la fin
  Son.jouer(ok ? 'succes' : 'echec');
  if (ok) {
    indicesVus.add(p.type);                             // réussi : on n'affichera plus les indications pour cette sorte de piège
    p.etat = 'resolu'; p.tunnel = p.type === 'buisson' && p.sortie.some(v => v === 1);
    montrerBulle(p.tunnel ? p.tunnelTexte : p.succes);
  } else { p.etat = 'actif'; p.anim = null; p.phases = null; montrerBulle(p.echec); }
  expliquer(p, nUtilise, ok);                             // et on explique POURQUOI, avec la taille de la carte et celle de l'obstacle
  commencerMarche(p, 1400);                               // puis le chevalier avance tout seul : si le choix était bon il passe, sinon il en subit les conséquences
}
function reussiAvec(p, sortie) {
  if (typeof NOUVEAUX !== 'undefined' && NOUVEAUX[p.type]) return NOUVEAUX[p.type].reussi(p, sortie);
  if (p.type === 'trou') return sortie.slice((p.rows - 1) * p.cols).every(v => v === 1);   // toute la rangée du sol est pleine
  if (p.type === 'buisson') return p.tigesIdx.every(i => sortie[i] === 0);                  // plus aucune tige épineuse
  return true;                                                                               // le sable : n'importe quelle fenêtre le mélange
}
function reussi(p) { return reussiAvec(p, p.sortie); }
function filtrer(p, n) {                              // le résultat final du filtre avec une carte de taille n (le moteur de convolution fait tout le calcul)
  let e = p.g; FILTRES[p.outil].forEach(op => { e = balayer(e, p.cols, p.rows, tailleDe(op, n), op); }); return e;
}
function taillesQuiMarchent(p) {                       // les tailles de carte qui réussissent ; il peut y en avoir une seule (la moyenne), ou plusieurs
  if (!p.tailles) { p.tailles = [3, 5, 7].filter(n => reussiAvec(p, filtrer(p, n))); if (!p.tailles.length) p.tailles = [7]; }
  return p.tailles;
}
const tailleMinimale = p => Math.min(...taillesQuiMarchent(p)), tailleMaximale = p => Math.max(...taillesQuiMarchent(p));

function valeurCase(p, c, r) {                          // valeur à AFFICHER : avant ou après la loupe selon où elle en est
  const i = r * p.cols + c;
  if (p.etat === 'actif') return p.g[i];
  if (p.etat === 'resolu') return p.sortie[i];
  const ph = p.phases[p.anim.ph];
  return c * p.rows + r < p.anim.k ? ph.sortie[i] : ph.entree[i];
}
function surTrou() {                                    // le héros est-il au-dessus d'un trou encore ouvert ? (utilisé par la physique dans jeu.js)
  return pieges.some(p => (p.type === 'trou' || p.type === 'brouillard') && p.etat !== 'resolu' && heros.x > p.zx + 10 && heros.x < p.zx + p.zl - 10);
}

function mourir(p) {
  heros.auto = null; faireReapparaitre(pieges.indexOf(p)); perdreVie();
  heros.tombe = false; heros.vx = 0; heros.vy = 0; heros.y = SOL_Y; heros.auSol = true; heros.enfonce = 0;
  if (vies <= 0) { recommencerNiveau(); return; }       // plus de vies : le niveau recommence
  heros.x = Math.max(120, p.zx - 260);                  // point de reprise : juste avant le piège
  montrerBulle(p.mort);
}
function epines(p) {                                    // le prince s'est jeté dans les épines
  heros.auto = null; perdreVie(); heros.invulFin = performance.now() + 1600;
  if (vies <= 0) { recommencerNiveau(); return; }
  heros.x = p.zx - 150; heros.vx = -180; heros.vy = -380; heros.auSol = false;
  montrerBulle(p.epinesTexte);
}

function majPieges(dt) {
  const appui = veut('action') && !actionAvant;         // appui "neuf" : on ignore la touche maintenue
  actionAvant = veut('action');
  let dansSable = null;
  heros.ralenti = 1;
  const enCours = pieges.find(p => p.etat === 'anim');
  if (appui && enCours) enCours.anim.rapide = !enCours.anim.rapide;       // E pendant que le filtre glisse : on accélère / on ralentit
  pieges.forEach(p => {
    if (p.etat === 'anim') avancerAnim(p, dt);
    if (NOUVEAUX[p.type]) majNouveau(p, performance.now() < (heros.invulFin || 0));      // tornade, mur : ils blessent tant qu'ils ne sont pas résolus
    if (p.type === 'buisson') {
      const invul = performance.now() < (heros.invulFin || 0);
      if (p.etat !== 'resolu') {                        // les tiges sont debout : les épines blessent
        if (heros.x > p.zx - 20 && heros.x < p.zx + p.zl) { if (invul) { heros.x = p.zx - 20; heros.vx = Math.min(0, heros.vx); } else epines(p); }
      } else if (p.tunnel) {                            // la voûte reste : il faut s'accroupir pour passer dessous
        if (heros.x > p.zx - 18 && heros.x < p.zx + 24 && !heros.accroupi) {
          heros.x = p.zx - 18; heros.vx = Math.min(0, heros.vx);
          if (performance.now() - p.msgT > 4000) { p.msgT = performance.now(); montrerBulle(p.baisseTexte); }
        } else if (heros.x >= p.zx + 24 && heros.x < p.zx + p.zl + 10) heros.forceBas = true;      // sous le buisson : impossible de se relever
        if (heros.auto && heros.x > p.zx - 90 && heros.x < p.zx + p.zl + 10) heros.forceBas = true;    // en marche automatique : le chevalier s'accroupit tout seul
      }
    }
    if (p.type === 'sable' && p.etat !== 'resolu' && heros.auSol && heros.x > p.zx + 8 && heros.x < p.zx + p.zl - 8) dansSable = p;
    if (p.etat === 'actif') {
      if (!p.indice && !lunettes && heros.x > p.zx - 380 && heros.x < p.zx) { p.indice = true; if (!indicesVus.has(p.type)) montrerBulle(p.indiceTexte || TYPES[p.type].indice); }
      if (appui && !enCours && !heros.auto && heros.x > p.zx - 300 && heros.x < p.zx + p.zl + 100) essayerFiltre(p);
    }
  });
  if (dansSable) {                                      // dans le sable : on ralentit, on s'enfonce, et on ne peut plus sauter
    heros.ralenti = 0.3; heros.enfonce += 24 * dt;
    if (heros.enfonce >= 28) mourir(dansSable);
  } else heros.enfonce = Math.max(0, heros.enfonce - 90 * dt);
  if (heros.tombe && heros.y > SOL_Y + 110) {           // tombé hors de l'écran : on retrouve le trou le plus proche
    const trous = pieges.filter(p => p.type === 'trou' || p.type === 'brouillard').sort((a, b) => Math.abs(a.zx - heros.x) - Math.abs(b.zx - heros.x));
    mourir(trous[0]);
  }
}

/* ---------- Dessin ---------- */
function pilule(txt, cx, cy) {                          // petite bulle de texte centrée sur (cx, cy)
  ctx.font = "600 18px 'Baloo 2', system-ui, sans-serif";
  const w = ctx.measureText(txt).width + 24;
  ctx.fillStyle = '#fff4dc'; ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - 18, w, 32, 16); ctx.fill();
  ctx.fillStyle = '#3a2146'; ctx.textAlign = 'center'; ctx.fillText(txt, cx, cy + 4); ctx.textAlign = 'start';
}

function dessinerSable(p, sx) {
  for (let c = 0; c < p.cols; c++) for (let r = 0; r < p.rows; r++) {
    const v = valeurCase(p, c, r);
    ctx.fillStyle = `rgb(${v[0]},${v[1]},${v[2]})`; ctx.fillRect(sx + c * p.cell, p.y0 + r * p.cell, p.cell, p.cell);
  }
}
function decorTrou(p, sx, t) {                          // ce qu'on voit au fond du trou selon la variante : eau, pointes, racines, éclats de verre
  const sk = p.skin, x0 = sx + 3 * p.cell, w = p.large * p.cell, r = R(p.x + 3);
  if (!sk || sk === 'fosse') return;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, SOL_Y, w, H - SOL_Y); ctx.clip();
  if (sk === 'planches') {                              // de l'eau sombre qui reflète la lumière
    ctx.fillStyle = deg(ctx, 0, SOL_Y, 0, H, [[0, '#2a2a70'], [1, '#080826']]); ctx.fillRect(x0, SOL_Y, w, H - SOL_Y);
    ctx.strokeStyle = 'rgba(200,180,255,0.4)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) { const y = SOL_Y + 12 + k * 14, xx = x0 + ((t / 30 + k * 53) % (w - 40)); ctx.beginPath(); ctx.ellipse(xx + 20, y, 22, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
  } else if (sk === 'oubliette') {                      // des pointes au fond
    for (let x = x0; x < x0 + w; x += 18) { ctx.fillStyle = deg(ctx, x, 0, x + 18, 0, [[0, '#4a4658'], [0.5, '#c8c4d8'], [1, '#3a3648']]); ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + 9, H - 26); ctx.lineTo(x + 18, H); ctx.fill(); }
  } else if (sk === 'racines') {                        // des racines qui pendent dans le vide
    ctx.strokeStyle = '#3a2412'; ctx.lineCap = 'round';
    for (let k = 0; k < w / 26; k++) { const x = x0 + 10 + k * 26 + r() * 8; ctx.lineWidth = 3 + r() * 4; ctx.beginPath(); ctx.moveTo(x, SOL_Y); ctx.quadraticCurveTo(x + (r() - 0.5) * 30, SOL_Y + 30, x + (r() - 0.5) * 24, SOL_Y + 40 + r() * 36); ctx.stroke(); }
  } else if (sk === 'vitres') {                         // des éclats de verre qui brillent au bord
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 16; k++) { const x = x0 + r() * w, y = SOL_Y + r() * 70, c = [[255, 150, 200], [120, 170, 255], [255, 230, 120]][k % 3]; ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.25 + 0.25 * Math.sin(t / 400 + k)})`; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y + 6); ctx.lineTo(x + 4, y + 18); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}
function dessinerTrou(p, sx, t) {
  if (p.etat === 'resolu') return dessinerCicatrice(p, sx, t);
  if (p.etat === 'anim') return dessinerVuePixels(p, sx);                     // pendant le filtre : la vue en pixels clairs et foncés
  const anim = p.etat === 'anim', vide = ctx.createLinearGradient(0, SOL_Y, 0, H);
  vide.addColorStop(0, '#04050c'); vide.addColorStop(1, '#000');
  for (let c = 0; c < p.cols; c++) for (let r = anim ? 0 : p.rows - 1; r < p.rows; r++) {
    const v = valeurCase(p, c, r), x = sx + c * p.cell, y = p.y0 + r * p.cell, sol = r === p.rows - 1;
    if (sol && v === 0) { ctx.fillStyle = vide; ctx.fillRect(x - 0.5, SOL_Y - 3, p.cell + 1, H - SOL_Y + 3); }
    else if (v === 1 && anim) {                         // les cases de terre ne se dessinent que pendant le filtre (sinon on voit le vrai décor)
      ctx.fillStyle = sol ? TERRE : 'rgba(122,92,62,0.55)'; ctx.fillRect(x, y, p.cell + 1, p.cell + 1);
    }
  }
  if (!anim) decorTrou(p, sx, t);
}
function dessinerCicatrice(p, sx, t) {                  // le trou a été bouché : une réparation reste visible, différente selon la variante
  const x0 = sx + 3 * p.cell, w = p.large * p.cell, y = SOL_Y, r = R(p.x + 5), sk = p.skin;
  const pulse = 0.5 + 0.5 * Math.sin(t / 700), cx = x0 + w / 2, cy = y + 42;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 3, y - 3, w + 6, H - y + 3); ctx.clip();
  if (sk === 'planches') {                              // des planches de bois neuves, clouées
    ctx.fillStyle = deg(ctx, 0, y, 0, H, [[0, '#9a7a52'], [1, '#3a2a1c']]); ctx.fillRect(x0 - 3, y - 3, w + 6, H - y + 3);
    for (let yy = y, k = 0; yy < H; yy += 24, k++) { ctx.fillStyle = `rgba(${60 + 40 * r()},${44 + 30 * r()},${26 + 20 * r()},0.5)`; ctx.fillRect(x0 - 3, yy + 1, w + 6, 21); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x0 - 3, yy + 22, w + 6, 2);
      ctx.fillStyle = '#d8d0e0'; for (let xx = x0 + 14; xx < x0 + w; xx += 70) { ctx.beginPath(); ctx.arc(xx + r() * 6, yy + 11, 2.2, 0, Math.PI * 2); ctx.fill(); } }
  } else if (sk === 'vitres') {                         // des carreaux de verre colorés qui brillent
    const cols = [[255, 130, 190], [120, 170, 255], [255, 220, 110], [120, 230, 170]];
    for (let yy = y - 2, j = 0; yy < H; yy += 30, j++) for (let xx = x0 - 3, i = 0; xx < x0 + w + 3; xx += 30, i++) { const c = cols[(i + j * 2) % 4];
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.5 + 0.2 * Math.sin(t / 600 + i + j)})`; ctx.fillRect(xx + 1, yy + 1, 28, 28); }
    ctx.strokeStyle = 'rgba(10,8,20,0.85)'; ctx.lineWidth = 2; for (let xx = x0 - 3; xx < x0 + w + 6; xx += 30) { ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, H); ctx.stroke(); } for (let yy = y; yy < H; yy += 30) { ctx.beginPath(); ctx.moveTo(x0 - 3, yy); ctx.lineTo(x0 + w + 3, yy); ctx.stroke(); }
  } else if (sk === 'oubliette') {                      // une grille de fer posée sur l'ancienne oubliette
    ctx.fillStyle = deg(ctx, 0, y, 0, H, [[0, '#1a1426'], [1, '#05030a']]); ctx.fillRect(x0 - 3, y - 3, w + 6, H - y + 3);
    ctx.fillStyle = 'rgba(255,140,60,' + (0.12 + 0.1 * pulse) + ')'; ctx.fillRect(x0, y, w, H - y);
    ctx.strokeStyle = deg(ctx, x0, 0, x0 + 10, 0, [[0, '#2a2a3a'], [0.5, '#c8c8dc'], [1, '#4a4a5c']]); ctx.lineWidth = 6;
    for (let xx = x0 + 8; xx < x0 + w; xx += 26) { ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, H); ctx.stroke(); } for (let yy = y + 16; yy < H; yy += 40) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); ctx.stroke(); }
    ctx.fillStyle = '#e8e8f4'; for (let xx = x0 + 8; xx < x0 + w; xx += 26) { ctx.beginPath(); ctx.arc(xx, y + 16, 3, 0, Math.PI * 2); ctx.fill(); }
  } else {                                              // pavage de pierre (fossé) ou terre vivante couverte de racines (gouffre)
    const racine = sk === 'racines';
    ctx.fillStyle = racine ? deg(ctx, 0, y, 0, H, [[0, '#4a3a22'], [1, '#1a1208']]) : deg(ctx, 0, y, 0, H, [[0, '#7a8296'], [1, '#2e3444']]); ctx.fillRect(x0 - 3, y - 3, w + 6, H - y + 3);
    if (racine) { ctx.strokeStyle = '#2a1a0c'; ctx.lineCap = 'round'; for (let k = 0; k < w / 20; k++) { ctx.lineWidth = 3 + r() * 4; ctx.beginPath(); const xx = x0 + r() * w; ctx.moveTo(xx, y); ctx.bezierCurveTo(xx + 30, y + 24, xx - 30, y + 48, xx + (r() - 0.5) * 60, H); ctx.stroke(); }
      ctx.fillStyle = 'rgba(120,70,200,0.35)'; ctx.beginPath(); ctx.ellipse(x0 + w * 0.3, y + 2, w * 0.2, 6, 0, 0, Math.PI * 2); ctx.ellipse(x0 + w * 0.7, y + 3, w * 0.15, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    else for (let yy = y - 2, j = 0; yy < H; yy += 24, j++) for (let xx = x0 - 3 - (j % 2) * 22; xx < x0 + w + 3; xx += 44) {
      const v = 0.65 + r() * 0.5; ctx.fillStyle = `rgb(${Math.round(110 * v)},${Math.round(118 * v)},${Math.round(136 * v)})`; ctx.beginPath(); ctx.roundRect(xx + 1.5, yy + 1.5, 41, 21, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(xx + 4, yy + 3, 34, 2); }
    ctx.globalCompositeOperation = 'lighter';
    const lu = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.6); lu.addColorStop(0, `rgba(120,190,255,${0.2 + 0.12 * pulse})`); lu.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = lu; ctx.fillRect(x0, y, w, H - y);
    ctx.strokeStyle = `rgba(170,220,255,${0.5 + 0.3 * pulse})`; ctx.lineWidth = 2;               // la rune de scellement
    ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; ctx.moveTo(cx + Math.cos(a) * 19, cy + Math.sin(a) * 19); ctx.lineTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28); }
    ctx.moveTo(cx - 9, cy + 6); ctx.lineTo(cx, cy - 10); ctx.lineTo(cx + 9, cy + 6); ctx.closePath(); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 3;                                  // bords irréguliers : on voit la réparation
  [x0 - 1, x0 + w + 1].forEach((xe, k) => { ctx.beginPath(); ctx.moveTo(xe, y - 3); for (let yy = y; yy < H + 10; yy += 12) ctx.lineTo(xe + (k ? -1 : 1) * (r() * 5), yy); ctx.stroke(); });
  ctx.restore();
}
function dessinerBuisson(p, sx, t) {
  if (p.etat === 'anim') { dessinerVuePixels(p, sx); return; }              // pendant le filtre : la vue en pixels clairs et foncés
                     // chaque case "pleine" affiche son morceau de végétation ; les cases effacées disparaissent
  ctx.save(); ctx.beginPath(); ctx.rect(sx - 80, 0, p.l + 160, SOL_Y + 10); ctx.clip();       // on coupe au niveau du sol
  if (p.etat === 'resolu' && p.tunnel) {                // le tunnel : de l'ombre sous la voûte
    const hb = p.y0 + (p.epais + 1) * p.cell, om = ctx.createLinearGradient(0, hb, 0, SOL_Y);
    om.addColorStop(0, 'rgba(0,0,6,0.7)'); om.addColorStop(1, 'rgba(0,0,6,0.3)'); ctx.fillStyle = om; ctx.fillRect(sx + 2 * p.cell, hb, p.zl, SOL_Y - hb);
  }
  for (let r = 0; r < p.rows - 2; r++) for (let c = 0; c < p.cols; c++) {
    const sp = p.sprites[r * p.cols + c];
    if (sp && valeurCase(p, c, r) === 1) ctx.drawImage(sp, sx + c * p.cell + p.cell / 2 - sp.width / 2, p.y0 + r * p.cell + p.cell / 2 - sp.height / 2);
  }
  if (p.etat === 'resolu') {                            // les souches des tiges coupées, quelques branches par terre
    const r = R(p.x + 11);
    p.tiges.forEach(c => { const x = sx + c * p.cell;
      const sc = p.art ? p.art.souche : ['#1a1208', '#4a3a1c', '#6a5a30'];
      ctx.fillStyle = deg(ctx, x - 9, 0, x + 9, 0, [[0, sc[0]], [0.6, sc[1]], [1, sc[2]]]); ctx.beginPath(); ctx.moveTo(x - 9, SOL_Y + 4); ctx.lineTo(x - 6, SOL_Y - 12); ctx.lineTo(x + 6, SOL_Y - 10); ctx.lineTo(x + 9, SOL_Y + 4); ctx.fill();
      ctx.fillStyle = '#9a8a5a'; ctx.beginPath(); ctx.ellipse(x, SOL_Y - 11, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); const bx = x + (r() - 0.5) * 50; ctx.moveTo(bx, SOL_Y + 6); ctx.lineTo(bx + 20 + r() * 10, SOL_Y + 4 + r() * 3); ctx.stroke(); });
  }
  ctx.restore();
}

const CLAIR = '#f3e6b4', FONCE = '#1b1233';           // les deux sortes de pixels : clair = il y a quelque chose, foncé = c'est vide
function dessinerVuePixels(p, sx, alpha = 1, figee = false) {      // la convolution se voit pixel par pixel : des gros carrés clairs et foncés
  const c = p.cell, lignes = p.type === 'buisson' ? p.rows - 2 : p.rows;     // buisson : les 2 dernières rangées sont sous terre
  const zs = p.zx - camX, zh = Math.min(p.zy1, H) - p.zy0;                   // la zone du piège : on ne dessine QUE là, pas sur tout l'écran
  ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.rect(zs - 6, p.zy0 - 6, p.zl + 12, zh + 12); ctx.clip();
  ctx.fillStyle = 'rgba(10,6,24,0.6)'; ctx.fillRect(zs - 6, p.zy0 - 6, p.zl + 12, zh + 12);
  for (let r = 0; r < lignes; r++) for (let col = 0; col < p.cols; col++) {
    const x = sx + col * c, y = p.y0 + r * c; if (x + c < zs || x > zs + p.zl) continue;
    const v = figee ? p.sortie[r * p.cols + col] : valeurCase(p, col, r);
    if (p.numerique) { ctx.fillStyle = couleurPixel(p, v, opAffichee(p, col, r, figee)); ctx.fillRect(x + 1, y + 1, c - 2, c - 2); continue; }
    ctx.fillStyle = v ? CLAIR : FONCE; ctx.fillRect(x + 1, y + 1, c - 2, c - 2);
    ctx.fillStyle = v ? 'rgba(255,255,255,0.5)' : 'rgba(150,120,255,0.2)'; ctx.fillRect(x + 1, y + 1, c - 2, 3); ctx.fillRect(x + 1, y + 1, 3, c - 2);   // le relief du pixel
  }
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5; ctx.strokeRect(zs - 6, p.zy0 - 6, p.zl + 12, zh + 12);
  ctx.restore();
}
/* La matrice du filtre (le « noyau ») : n×n cases colorées selon le filtre (bleu = flou, orange = rétrécir, vert = grossir).
   Pas de chiffres : seulement des couleurs (les pixels sont foncés pour 0 et clairs pour 1). */
function dessinerMatrice(x, y, n, s, op, alpha, g = ctx) {
  const col = COULEUR_OP[op], poids = noyauAffiche(op, n), forts = poids.map(Math.abs), fort = Math.max(...forts), variable = fort - Math.min(...forts) > 1e-9 || poids.some(w => w < 0);
  g.save();
  for (let j = 0; j < n * n; j++) {
    const cx = x + (j % n) * s, cy = y + Math.floor(j / n) * s, w = poids[j], neg = w < 0;
    const rgb = neg ? '255,90,90' : (op === 'nettete' || op === 'laplace3' ? '90,170,255' : col), a = variable ? 0.18 + 0.62 * forts[j] / fort : 0.42;     // le poids se voit à l'intensité de la couleur
    g.fillStyle = `rgba(${rgb},${a * alpha})`; g.fillRect(cx, cy, s, s);
    g.strokeStyle = `rgba(${rgb},${0.95 * alpha})`; g.lineWidth = s >= 14 ? 2 : 1; g.strokeRect(cx + 0.5, cy + 0.5, s - 1, s - 1);
  }
  g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.strokeRect(x, y, n * s, n * s);                 // le cadre doré autour de la carte
  g.restore();
}
function dessinerGrilleP(p, sx, zs) {                    // les lunettes montrent que le piège est fait de petits carrés, et la taille de la fenêtre
  const n = tailleFenetre, c = p.cell;
  let gx0, gy0, gw, gh;
  if (p.type === 'sable') { gx0 = sx; gy0 = SOL_Y; gw = p.l; gh = p.rows * c; }
  else if (p.type === 'trou') { gx0 = zs; gy0 = SOL_Y; gw = p.zl; gh = H - SOL_Y; }
  else if (p.numerique) { gx0 = zs; gy0 = p.y0; gw = p.zl; gh = Math.min(p.rows * c, p.zy1 - p.y0); }
  else { gx0 = zs; gy0 = p.y0 + c; gw = p.zl; gh = SOL_Y - gy0; }
  ctx.save(); ctx.globalAlpha = 0.38 * lunettesAlpha; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x <= gw + 0.5; x += c) { ctx.moveTo(gx0 + x, gy0); ctx.lineTo(gx0 + x, gy0 + gh); }
  for (let y = 0; y <= gh + 0.5; y += c) { ctx.moveTo(gx0, gy0 + y); ctx.lineTo(gx0 + gw, gy0 + y); }
  ctx.stroke(); ctx.restore();
  if (outilActif !== p.outil || p.type === 'sable') return;
  const cx = p.numerique ? zs + p.zl / 2 : p.type === 'trou' ? zs + p.zl / 2 : sx + p.tiges[0] * c, cy = p.numerique ? p.y0 + p.rows * c / 2 : p.type === 'trou' ? SOL_Y + c / 2 : SOL_Y - c, t = tailleDe(p.outil === 'contours' ? 'gauss' : p.outil, n) * c;   // aperçu de la carte n×n
  ctx.save(); ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeStyle = '#ffd166'; ctx.fillStyle = 'rgba(255,209,102,0.14)';
  ctx.beginPath(); ctx.rect(cx - t / 2, cy - t / 2, t, t); ctx.fill(); ctx.stroke(); ctx.restore();
  if (!indicesVus.has(p.type)) pilule(nomCarteMaj(n), cx, cy - t / 2 - 16);
}

function dessinerPieges(t) {
  pieges.forEach(p => {
    const sx = p.x - camX, zs = p.zx - camX;
    if (sx > W + 20 || sx + p.l < -20) return;          // hors écran : on ne dessine pas
    const a = p.visible || p.etat === 'resolu' ? 1 : (p.etat === 'actif' ? lunettesAlpha : 1);   // camouflé sans lunettes (sauf le buisson, et sauf une fois résolu)
    if (a > 0.01) { ctx.save(); ctx.globalAlpha = a; ({ sable: dessinerSable, trou: dessinerTrou, buisson: dessinerBuisson, tornade: dessinerTornade, mur: dessinerMur, brouillard: dessinerBrouillard })[p.type](p, sx, t); ctx.restore(); }
    dessinerPanneauMatrices(p);                         // la vue Entrée → Filtre → Résultat (matrices.js)
    if (p.vueFin && p.type !== 'sable' && p.etat !== 'anim' && performance.now() - p.vueFin < 1100) dessinerVuePixels(p, sx, 1 - (performance.now() - p.vueFin) / 1100, true);
    if (p.etat === 'actif') {
      ctx.save();
      if (lunettesAlpha < 0.99 && !p.visible) {         // sans lunettes : un léger scintillement trahit le piège
        for (let i = 0; i < 8; i++) {
          ctx.globalAlpha = 0.4 * (1 - lunettesAlpha) * (0.5 + 0.5 * Math.sin(t / 300 + i * 1.7));
          ctx.fillStyle = '#fff4c0'; ctx.beginPath(); ctx.arc(zs + ((t / 25 + i * 61) % p.zl), SOL_Y + 6 + (i % 3) * 10, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = lunettesAlpha;                  // avec lunettes : contour d'alerte qui pulse + nom du piège
      ctx.strokeStyle = `rgba(255,150,60,${0.5 + 0.4 * Math.sin(t / 250)})`; ctx.lineWidth = 3;
      ctx.strokeRect(zs - 2, p.zy0, p.zl + 4, p.zy1 - p.zy0);
      ctx.fillStyle = '#ffb870'; ctx.font = "600 20px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = 'center';
      ctx.fillText('⚠ ' + p.nom, zs + p.zl / 2, Math.min(SOL_Y - 22, p.zy0 - 8));
      ctx.restore();
      if (lunettesAlpha > 0.4 && heros.x > p.zx - 520 && heros.x < p.zx + p.zl + 200) dessinerGrilleP(p, sx, zs);   // avec les lunettes, on voit les carrés
      if (lunettesAlpha > 0.5 && !indicesVus.has(p.type) && heros.x > p.zx - 300 && heros.x < p.zx + p.zl + 100) {   // rappel de ce qu'il faut faire (une seule fois par sorte de piège)
        const o = OUTILS_PIEGE[p.outil];
        pilule(outilActif === p.outil ? `E : lancer ${o.nom} avec la ${nomCarte(tailleFenetre)}${niveauActuel.entrainement ? '' : ' (🪙 ' + COUT_CARTE[tailleFenetre] + ')'} ✨` : `Choisis ${o.nom} ${o.icone} (touche ${o.touche})`, heros.x - camX, heros.y - 135);
      }
    }
    if (p.etat === 'anim') {                            // la fenêtre magique qui balaie la grille
      const a2 = p.anim, k = Math.min(a2.k, p.cols * p.rows - 1), n = a2.n, c = Math.floor(k / p.rows), r = k % p.rows;
      const opA = p.phases[a2.ph].op, nn = tailleDe(opA, n), gx = sx + (c - (nn - 1) / 2) * p.cell, gy = p.y0 + (r - (nn - 1) / 2) * p.cell;
      ctx.save(); ctx.beginPath(); ctx.rect(p.zx - camX, p.zy0, p.zl, Math.min(p.zy1, H) - p.zy0); ctx.clip();      // la carte n'apparaît que SUR le piège (sa zone), pas sur tout l'écran
      dessinerMatrice(gx, gy, nn, p.cell, opA, 1);       // la carte qui passe : n×n cases colorées (clair = 1, foncé = 0 pour les pixels, aucun chiffre)
      ctx.restore();
      const op = p.phases[a2.ph].op;
      pilule(({ moyenne: 'La Brume passe sur chaque pixel', gauss: 'La Berceuse calme chaque pixel', nettete: 'Le Lynx fait ressortir chaque pixel' })[op] ? ({ moyenne: 'La Brume passe sur chaque pixel', gauss: 'La Berceuse calme chaque pixel', nettete: 'Le Lynx fait ressortir chaque pixel' })[op] + ' · E : accélérer' : p.phases.length > 1 && op === 'laplace3' ? `Étape 2 sur 2 : on cherche les contours · E : accélérer` : p.outil === 'contours' ? `Étape 1 sur 2 : on calme le bruit · E : accélérer` : `Étape ${a2.ph + 1} sur ${p.phases.length} : ${op === 'maximum' ? 'on grossit' : 'on rétrécit'} · E : accélérer`, zs + p.zl / 2, Math.min(SOL_Y - 80, p.zy0 - 30));
    }
  });
}