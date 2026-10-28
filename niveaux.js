/* =====================================================
   LES NIVEAUX : cinq niveaux, chacun avec son décor et sa difficulté
   Un niveau = un thème de décor + une liste de pièges + une liste d'humains contaminés + des réglages :
     difficulte : le nom affiché
     longueur   : distance à parcourir jusqu'au portail de sortie
     pieges     : sable | trou (large = nombre de cases de large : plus c'est large, plus la carte doit être grande)
                  | buisson (tige = 1 ou 3 : épaisseur des tiges ; epais = épaisseur de la voûte)
     humains    : positions ; vitHumain = leur vitesse ; contact = temps (s) avant qu'ils ne contaminent
   Règle du filtre : une carte n×n bouche un trou de largeur < n (fermeture) et efface ce qui est plus fin que n (ouverture).
   ===================================================== */
const HUMAINS_ACTIFS = false;      // les humains contaminés sont désactivés pour l'instant (leurs données restent dans chaque niveau) : mets true pour les remettre

/* Chaque piège a un type (la mécanique : sable = flou, trou = fermeture, buisson = ouverture) et une variante « skin » (l'apparence et les mots, propres au niveau). */
const NIVEAUX = [
  { nom: 'La forêt des lucioles', theme: 'lucioles', difficulte: 'Facile', longueur: 4300,
    pieges: [{ type: 'sable', x: 800 }, { type: 'trou', x: 1500, large: 4 }, { type: 'buisson', x: 2400, tige: 1, epais: 3 }],
    humains: [{ x: 3600 }], vitHumain: 80, contact: 2.0, scan: { coeur: 3, bruit: 0.2 },
    lecon: "La Brume mélange les couleurs voisines. Le Mortier bouche un trou plus petit que la carte. La Faucille coupe ce qui est plus fin que la carte." },
  { nom: 'La forêt enchantée', theme: 'violette', difficulte: 'Moyen', longueur: 6300, filtres: ['flou', 'ouverture', 'fermeture', 'gaussien'],
    pieges: [{ type: 'sable', skin: 'poussiere', x: 700 }, { type: 'trou', skin: 'racines', x: 1400, large: 4 }, { type: 'tornade', x: 2100 }, { type: 'buisson', skin: 'ronces', x: 3000, tige: 1, epais: 3 }, { type: 'trou', skin: 'racines', x: 3800, large: 5 }],
    humains: [{ x: 4300 }, { x: 4900 }], vitHumain: 100, contact: 1.7, scan: { coeur: 3, bruit: 0.26 },
    lecon: "Plus un obstacle est grand, plus la carte doit l'être : pour un gouffre de 5 cases, il faut la carte suprême. Et la Berceuse calme la tornade : ni trop petite, ni trop grande !" },
  { nom: 'Le marais pourpre', theme: 'marais', difficulte: 'Difficile', longueur: 6900, filtres: ['flou', 'ouverture', 'fermeture', 'gaussien', 'nettete'],
    pieges: [{ type: 'sable', skin: 'vase', x: 600 }, { type: 'buisson', skin: 'roseaux', x: 1250, tige: 3, epais: 5 }, { type: 'brouillard', variante: 'A', x: 1950 }, { type: 'trou', skin: 'planches', x: 2800, large: 5 }, { type: 'sable', skin: 'vase', x: 3700 }, { type: 'trou', skin: 'planches', x: 4300, large: 6 }],
    humains: [{ x: 5000 }, { x: 5500 }, { x: 5800 }], vitHumain: 115, contact: 1.5, scan: { coeur: 5, bruit: 0.32 },
    lecon: "Le Lynx fait ressortir les détails cachés dans le brouillard. Attention : une carte trop grande efface aussi le feuillage ! Il faut qu'elle soit plus grande que les roseaux, mais pas plus grande que le feuillage." },
  { nom: 'Le donjon', theme: 'donjon', difficulte: 'Très difficile', longueur: 7400, filtres: ['flou', 'ouverture', 'fermeture', 'gaussien', 'nettete', 'contours'],
    pieges: [{ type: 'trou', skin: 'oubliette', x: 700, large: 5 }, { type: 'buisson', skin: 'toiles', x: 1600, tige: 3, epais: 5 }, { type: 'mur', x: 2300 }, { type: 'sable', skin: 'gravats', x: 3100 }, { type: 'trou', skin: 'oubliette', x: 3600, large: 6 }, { type: 'buisson', skin: 'toiles', x: 4500, tige: 3, epais: 5 }],
    humains: [{ x: 5500 }, { x: 5900 }, { x: 6300 }], vitHumain: 130, contact: 1.3, scan: { coeur: 5, bruit: 0.38 },
    lecon: "Le Fusain révèle une porte secrète dans un mur lisse. Avec la bonne carte, tu coupes les fils d'une toile ou tu bouches une oubliette sans tout détruire." },
  { nom: 'La cathédrale des vitraux', theme: 'cathedrale', difficulte: 'Cauchemar', longueur: 8500, filtres: ['flou', 'ouverture', 'fermeture', 'gaussien', 'nettete', 'contours'],
    pieges: [{ type: 'sable', skin: 'verre', x: 600 }, { type: 'trou', skin: 'vitres', x: 1200, large: 6 }, { type: 'tornade', x: 2000 }, { type: 'buisson', skin: 'chaines', x: 2900, tige: 3, epais: 5 }, { type: 'brouillard', variante: 'B', x: 3700 }, { type: 'trou', skin: 'vitres', x: 4400, large: 6 }, { type: 'mur', x: 5100 }, { type: 'buisson', skin: 'chaines', x: 5900, tige: 3, epais: 5 }],
    humains: [{ x: 5600 }, { x: 6000 }, { x: 6400 }, { x: 6800 }], vitHumain: 145, contact: 1.2, final: true, scan: { coeur: 7, bruit: 0.46 },
    lecon: "Tu as tout compris !<br><b>Brume</b> : elle mélange.<br><b>Faucille</b> : elle coupe le fin.<br><b>Mortier</b> : il bouche les trous.<br><b>Berceuse</b> : elle calme.<br><b>Lynx</b> : il fait ressortir les détails.<br><b>Fusain</b> : il dessine les bords." }
];

/* Les niveaux sont plus longs : on étire tout (longueur et positions des pièges) pour laisser de la place aux pièces, aux rochers, aux plateformes et aux trésors. */
const ECHELLE_NIVEAUX = 1.7;
NIVEAUX.forEach(n => { n.longueur = Math.round(n.longueur * ECHELLE_NIVEAUX / 100) * 100; [...n.pieges, ...n.humains].forEach(o => { o.x = Math.round(o.x * ECHELLE_NIVEAUX / 10) * 10; }); });

/* L'ENTRAÎNEMENT : un parcours facile, sans aucun risque (vies illimitées), pour apprendre à choisir la bonne taille de carte.
   Plus l'obstacle est grand, plus la carte doit être grande : un petit trou, un moyen, un grand ; puis deux buissons. */
const ENTRAINEMENT = { nom: 'Entraînement', theme: 'lucioles', difficulte: 'Sans risque', longueur: 7200, entrainement: true,
  pieges: [{ type: 'sable', x: 800 }, { type: 'trou', x: 1500, large: 2 }, { type: 'trou', x: 2500, large: 4 }, { type: 'trou', x: 3600, large: 6 },
           { type: 'buisson', x: 4700, tige: 1, epais: 3 }, { type: 'buisson', x: 5900, tige: 3, epais: 5 }],
  humains: [], vitHumain: 80, contact: 2, scan: { coeur: 3, bruit: 0.2 },
  lecon: "Tu sais maintenant choisir ta carte : <b>plus l'obstacle est grand, plus la carte doit être grande</b> !" };

let niveauIdx = 0, niveauActuel = NIVEAUX[0], ecranOuvert = false;
let porte = { etat: 'fermee', t: 0 };                  // la porte de fin : fermee -> ouvre (les battants s'écartent) -> entree (le chevalier se fond dans la lumière) -> fin       // niveauIdx = -1 : l'entraînement
const decors = {};                                       // un décor par niveau, fabriqué une seule fois
const elBandeau = document.getElementById('bandeau'), elEcran = document.getElementById('ecran'), elNiveau = document.getElementById('niveau');
let minuteurBandeau;

function chargerNiveau(i) {
  niveauIdx = i; const niv = i < 0 ? ENTRAINEMENT : NIVEAUX[i]; niveauActuel = niv; Son.musique(niv.theme);          // une musique par niveau
  PIEGES = niv.pieges; HUMAINS = HUMAINS_ACTIFS ? niv.humains : []; VIT_HUMAIN = niv.vitHumain; CONTACT_TEMPS = niv.contact; SCAN_COEUR = niv.scan.coeur; SCAN_BRUIT = niv.scan.bruit; LONGUEUR_NIVEAU = niv.longueur;
  if (!decors[i]) { decors[i] = construireDecor(niv); decors[i].terre = TERRE; decors[i].herbe = HERBE; }
  decor = decors[i]; TERRE = decor.terre; HERBE = decor.herbe;
  Object.assign(heros, { x: 120, y: SOL_Y, vx: 0, vy: 0, auSol: true, tombe: false, enfonce: 0, ralenti: 1, accroupi: false, forceBas: false, invulFin: 0, tirT: 0, sens: 1, marche: 0, auto: null });
  porte = { etat: 'fermee', t: 0 };
  camX = 0; vies = 3; temps = 0; derniereSeconde = -1; lunettes = false; lunettesAlpha = 0; outilActif = null;
  const carteVapeur = document.querySelector('[data-outil="vapeur"]'); if (carteVapeur) carteVapeur.hidden = !HUMAINS_ACTIFS;      // la carte Vapeur n'a pas d'usage sans humains
  creerPieges(); creerHumains(); creerMonde(niv); majCartesFiltres(niv); majCoeurs(); majFenetre(); majOutils();
  elNiveau.textContent = niv.entrainement ? 'Entraînement' : 'Niv. ' + (i + 1) + '/' + NIVEAUX.length;
  elEcran.classList.remove('ouvert'); ecranOuvert = false; ecranPerdu = false; Stats.nouveauNiveau();
  cacherExplication();
  if (!accueilOuvert && !introOuvert) { let conseil = ''; if (i === 0) { try { if (localStorage.getItem('quete-entrainement-fait') !== '1') conseil = '<br><small>💡 Pas sûr de toi ? Essaie d\'abord l\'Entraînement (dans le menu)</small>'; } catch (e) { /* tant pis */ } }
  elBandeau.innerHTML = niv.entrainement ? '<b>Entraînement</b> · aucune vie à perdre<br><small>Apprends à choisir la bonne taille de carte</small>' : '<b>Niveau ' + (i + 1) + '</b> · ' + niv.nom + '<br><small>Difficulté : ' + niv.difficulte + '</small>' + conseil;
  elBandeau.classList.add('visible'); clearTimeout(minuteurBandeau); minuteurBandeau = setTimeout(() => elBandeau.classList.remove('visible'), 3800); }
}
let ecranPerdu = false;                                  // l'écran affiché est celui de la défaite
function recommencerNiveau() {                           // plus de vies : un vrai écran « perdu », avec un conseil
  ecranOuvert = true; ecranPerdu = true; cacherExplication(); Son.jouer('perdu');
  document.getElementById('ecran-titre').textContent = 'Oh non… plus de vies !';
  document.getElementById('ecran-etoiles').textContent = '☆☆☆';
  document.getElementById('ecran-texte').innerHTML = `Le chevalier est épuisé.<br><span class="lecon">${Stats.conseil()}</span>`;
  document.getElementById('ecran-suivant').textContent = 'Entraînement';
  elEcran.classList.add('ouvert');
}

function finNiveau() {
  ecranOuvert = true; ecranPerdu = false; cacherExplication(); Son.jouer('fin');
  const niv = niveauActuel, dernier = !niv.entrainement && niveauIdx === NIVEAUX.length - 1, s = Math.floor(temps);
  if (niv.entrainement) { try { localStorage.setItem('quete-entrainement-fait', '1'); } catch (e) { /* tant pis */ } } else sauverProgres(niveauIdx + 1);      // le niveau suivant se débloque
  document.getElementById('ecran-titre').textContent = niv.entrainement ? 'Entraînement terminé ! 🎓' : dernier ? 'La princesse est sauvée ! 👑' : 'Niveau terminé !';
  document.getElementById('ecran-etoiles').textContent = niv.entrainement ? '★★★' : '★'.repeat(Math.max(1, vies)) + '☆'.repeat(3 - Math.max(1, vies));
  const sm = Stats.resumePartie(), mn = Math.floor(s / 60), sec = s % 60;
  const duree = mn > 0 ? mn + ' min' + (sec ? ' ' + sec + ' s' : '') : sec + ' s';                   // « 2 min », pas « Temps : 2 min »
  const puces = [duree];
  if (!niv.entrainement) puces.push('❤️'.repeat(vies) + '🤍'.repeat(3 - vies), `🪙 ${nbPieces}`, `💎 ${tresors}/${coffres.length}`);       // les vies en cœurs, les pièces et les trésors avec leur émoji
  puces.push(`🎯 ${sm.parfaits}/${sm.total}`);
  document.getElementById('ecran-texte').innerHTML = `<div class="ecran-stats">${puces.map(x => `<span>${x}</span>`).join('')}</div><span class="lecon">${niv.lecon}</span>`;
  document.getElementById('ecran-suivant').textContent = niv.entrainement ? 'Jouer le niveau 1 ▶' : dernier ? '↺ Recommencer' : 'Niveau suivant ▶';
  elEcran.classList.add('ouvert');
}
function majNiveau(dt) {
  if (ecranOuvert) return;
  const finale = !!niveauActuel.final, butee = LONGUEUR_NIVEAU - (finale ? 80 : 4);          // où le chevalier s'arrête dans l'embrasure
  if (porte.etat === 'fermee') {
    if (heros.x >= LONGUEUR_NIVEAU - 320 && !animationEnCours()) {                           // il approche : la porte s'ouvre toute seule
      porte = { etat: 'ouvre', t: 0 }; Son.jouer('succes'); cacherExplication();
      heros.auto = { cible: butee, apres: performance.now() + 1900 };                          // et il marche vers la lumière, quand les battants sont ouverts
    }
  } else if (porte.etat === 'ouvre') {
    porte.t += dt;
    if (!heros.auto && porte.t > 1.8) { porte = { etat: 'entree', t: 0 }; Son.jouer('guerison'); }
    else if (!heros.auto) heros.auto = { cible: butee, apres: 0 };
  } else if (porte.etat === 'entree') {
    porte.t += dt;
    if (porte.t >= 1.7) { porte.etat = 'fin'; finNiveau(); }                                 // il a disparu : l'écran de fin s'affiche
  }
}
elEcran.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'ecran-rejouer') chargerNiveau(niveauIdx);
  else if (b.id === 'ecran-suivant' && ecranPerdu) { jeuEnCours = true; demarrer(-1); }
  else if (b.id === 'ecran-accueil') { jeuEnCours = false; chargerNiveau(niveauIdx < 0 ? 0 : niveauIdx); ouvrirAccueil(); }
  else if (b.id === 'ecran-suivant') { if (niveauActuel.entrainement) demarrer(0); else chargerNiveau(niveauIdx + 1 < NIVEAUX.length ? niveauIdx + 1 : 0); }
  b.blur();
});
/* =====================================================
   LA PORTE FÉERIQUE
   Fermée : deux battants de bois enchanté aux filigranes dorés, dans une arche de pierre violette couverte de lianes fleuries.
   Quand le chevalier approche : les battants s'écartent, une lumière dorée en jaillit, des étincelles s'envolent...
   puis le chevalier avance dans la lumière et s'y dissout (voir dessinerDisparition).
   ===================================================== */
const PORTE_L = 176, PORTE_H = 280;                     // largeur et hauteur de l'arche
const lisse = x => x * x * (3 - 2 * x);                 // démarrage et arrivée en douceur
const hasard = k => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };   // un « hasard » toujours le même pour un k donné
function etoile4(x, y, r, a) {                          // petite étoile à 4 branches, brillante
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = `rgba(255,248,215,${a})`; ctx.fill();
}
function battant(sx, y, W, H, ouv) {                    // les deux battants, dessinés dans l'arche (le clip est déjà posé)
  const demi = W / 2, lw = demi * (1 - 0.94 * ouv);
  [[sx - demi, 1], [sx + demi, -1]].forEach(([hx, sens]) => {
    ctx.save(); ctx.translate(hx, 0); ctx.scale(sens * lw / demi, 1);                // le battant pivote autour de sa charnière : il se rétrécit
    const bois = ctx.createLinearGradient(0, 0, demi, 0); bois.addColorStop(0, '#2a1646'); bois.addColorStop(0.5, '#4a2a74'); bois.addColorStop(1, '#6a3f98');
    ctx.fillStyle = bois; ctx.fillRect(0, y - H - 6, demi + 1, H + 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;                         // les planches
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(demi * k / 4, y - H); ctx.lineTo(demi * k / 4, y); ctx.stroke(); }
    ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';          // filigranes d'or : de gracieuses volutes
    for (const [py, amp] of [[0.30, 22], [0.52, 28], [0.74, 22]]) {
      ctx.beginPath(); ctx.moveTo(6, y - H * py); ctx.bezierCurveTo(demi * 0.3, y - H * py - amp, demi * 0.6, y - H * py + amp, demi - 8, y - H * py);
      ctx.moveTo(demi * 0.5, y - H * py); ctx.arc(demi * 0.5, y - H * py + 7, 7, -Math.PI / 2, Math.PI, true); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(demi * 0.5, y - 14); ctx.lineTo(demi * 0.5, y - H * 0.82); ctx.stroke();
    ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.arc(demi - 14, y - H * 0.42, 6, 0, Math.PI * 2); ctx.fill();   // la poignée dorée
    ctx.fillStyle = 'rgba(0,0,0,' + (0.38 * ouv) + ')'; ctx.fillRect(0, y - H - 6, demi + 1, H + 8);                // plus ouverts, ils sont dans l'ombre
    ctx.restore();
  });
}
function dessinerPortail(t) {                            // le portail de sortie du niveau
  const sx = LONGUEUR_NIVEAU - camX;
  if (sx < -320 || sx > W + 320) return;
  const tt = t / 1000, y = SOL_Y + 8, W2 = PORTE_L, H2 = PORTE_H, pulse = 0.5 + 0.5 * Math.sin(tt * 2.2);
  const ouv = porte.etat === 'fermee' ? 0 : porte.etat === 'ouvre' ? lisse(Math.min(1, porte.t / 1.7)) : 1;
  const cy = y - H2 * 0.45;
  // 1. la grande lueur, derrière : discrète fermée, éclatante ouverte
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const halo = 0.2 + 0.1 * pulse + 0.55 * ouv, r0 = 300 + 140 * ouv;
  const gl = ctx.createRadialGradient(sx, cy, 10, sx, cy, r0); gl.addColorStop(0, `rgba(255,225,170,${halo})`); gl.addColorStop(0.5, `rgba(255,170,230,${halo * 0.35})`); gl.addColorStop(1, 'rgba(255,170,230,0)');
  ctx.fillStyle = gl; ctx.fillRect(sx - r0, cy - r0, r0 * 2, r0 * 2); ctx.restore();
  // 2. l'intérieur : la lumière derrière les battants, puis les battants eux-mêmes
  ctx.save(); pathArche(ctx, sx, y, W2 - 26, H2 - 13); ctx.clip();
  const lu = ctx.createRadialGradient(sx, cy, 6, sx, cy, H2 * 0.7); lu.addColorStop(0, '#ffffff'); lu.addColorStop(0.35, '#fff3c0'); lu.addColorStop(0.75, '#ffd48a'); lu.addColorStop(1, '#ff9fd2');
  ctx.fillStyle = lu; ctx.fillRect(sx - W2, y - H2 - 10, W2 * 2, H2 + 20);
  if (ouv > 0) {                                         // des rayons qui bougent dans la lumière
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 7; k++) { const x = sx - 66 + k * 22 + Math.sin(tt * 0.9 + k * 1.7) * 9; ctx.fillStyle = `rgba(255,255,255,${(0.10 + 0.07 * Math.sin(tt * 1.6 + k)) * ouv})`; ctx.fillRect(x, y - H2, 9, H2); }
    ctx.globalCompositeOperation = 'source-over';
  }
  battant(sx, y, W2 - 26, H2 - 13, ouv);
  ctx.restore();
  // 3. la princesse attend dans la lumière (dernier niveau)
  if (niveauActuel.final && ouv > 0.55) { ctx.save(); ctx.globalAlpha = Math.min(1, (ouv - 0.55) / 0.35); dessinerPrincesse(sx + 22, SOL_Y + 10, tt); ctx.restore(); }
  // 4. l'arche de pierre violette, ses runes d'or et la pierre magique au sommet
  ctx.save(); pathArche(ctx, sx, y, W2, H2); ctx.lineWidth = 24; ctx.lineJoin = 'round';
  ctx.strokeStyle = deg(ctx, sx - W2 / 2, 0, sx + W2 / 2, 0, [[0, '#231640'], [0.35, '#5a4694'], [0.65, '#8a78c8'], [1, '#2d1e50']]); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
  pathArche(ctx, sx, y, W2 - 24, H2 - 12); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,214,120,0.9)'; ctx.stroke();
  for (let k = 0; k < 3; k++) { ctx.fillStyle = deg(ctx, sx - 110, 0, sx + 110, 0, [[0, '#251a42'], [1, '#8a78c8']]); ctx.fillRect(sx - W2 / 2 - 8 - k * 14, y - 2 + k * 8, W2 + 16 + k * 28, 8); }       // les marches
  ctx.globalCompositeOperation = 'lighter';
  const runes = [];
  for (let k = 0; k < 3; k++) { runes.push([sx - W2 / 2, y - 40 - k * 36]); runes.push([sx + W2 / 2, y - 40 - k * 36]); }
  for (let k = 1; k <= 4; k++) { const u = k / 5, a = 1 - u, b = u; const px = a * a * (sx - W2 / 2) + 2 * a * b * (sx - W2 / 2) + b * b * sx, py = a * a * (y - H2 * 0.55) + 2 * a * b * (y - H2 * 0.92) + b * b * (y - H2); runes.push([px, py]); runes.push([2 * sx - px, py]); }
  runes.forEach(([rx, ry], k) => {                       // des symboles d'or qui s'allument à tour de rôle
    const lum = 0.35 + 0.35 * Math.sin(tt * 2 + k * 0.9) + 0.4 * ouv; ctx.strokeStyle = `rgba(255,226,140,${Math.min(1, lum)})`; ctx.lineWidth = 2;
    ctx.beginPath(); if (k % 3 === 0) { ctx.moveTo(rx, ry - 5); ctx.lineTo(rx + 4, ry); ctx.lineTo(rx, ry + 5); ctx.lineTo(rx - 4, ry); ctx.closePath(); } else if (k % 3 === 1) { ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.moveTo(rx, ry - 8); ctx.lineTo(rx, ry - 4); } else { ctx.moveTo(rx - 5, ry + 4); ctx.lineTo(rx, ry - 5); ctx.lineTo(rx + 5, ry + 4); }
    ctx.stroke();
  });
  const gx = sx, gy = y - H2 + 2, gem = ctx.createRadialGradient(gx, gy, 1, gx, gy, 26 + 20 * ouv); gem.addColorStop(0, `rgba(190,255,255,${0.9})`); gem.addColorStop(1, 'rgba(190,255,255,0)');
  ctx.fillStyle = gem; ctx.fillRect(gx - 50, gy - 50, 100, 100);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#c8fbff'; ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx, gy - 14); ctx.lineTo(gx + 10, gy); ctx.lineTo(gx, gy + 14); ctx.lineTo(gx - 10, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
  // 5. des lianes fleuries, qui se balancent doucement
  for (const sens of [-1, 1]) for (let v = 0; v < 2; v++) {
    const bx = sx + sens * (W2 / 2 + 6 + v * 10), top = y - H2 * (0.5 + 0.18 * v);
    ctx.strokeStyle = '#2f7a62'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, y);
    ctx.bezierCurveTo(bx + sens * 16 + Math.sin(tt + v) * 3, y - (y - top) * 0.35, bx - sens * 14, y - (y - top) * 0.7, bx + sens * 4 + Math.sin(tt * 1.3 + v) * 3, top); ctx.stroke();
    for (let k = 0; k < 7; k++) {
      const u = (k + 1) / 8, lx = bx + sens * Math.sin(u * 5 + v) * 12, ly = y - (y - top) * u;
      ctx.fillStyle = k % 2 ? '#5fd0a0' : '#8ff0c0'; ctx.beginPath(); ctx.ellipse(lx + sens * 5, ly, 6, 2.8, sens * 0.7 + (k % 2 ? 0.8 : -0.5), 0, Math.PI * 2); ctx.fill();
      if (k % 3 === 1) { const fl = 0.5 + 0.5 * Math.sin(tt * 2.4 + k + v * 3), col = (k + v) % 2 ? '255,150,215' : '150,235,255';           // des fleurs qui scintillent
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, 14); g2.addColorStop(0, `rgba(${col},${0.55 + 0.4 * fl})`); g2.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g2; ctx.fillRect(lx - 14, ly - 14, 28, 28); ctx.restore();
        ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.restore();
  // 6. la lumière qui sort : rayons en éventail, flaque de lumière par terre, étincelles qui s'envolent
  if (ouv > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * Math.PI * 2 + tt * 0.12, len = (260 + 90 * hasard(k)) * ouv, wd = 0.07 + 0.04 * hasard(k + 9);
      const rg = ctx.createRadialGradient(sx, cy, 10, sx, cy, len); rg.addColorStop(0, `rgba(255,240,190,${0.22 * ouv})`); rg.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx + Math.cos(ang - wd) * len, cy + Math.sin(ang - wd) * len); ctx.lineTo(sx + Math.cos(ang + wd) * len, cy + Math.sin(ang + wd) * len); ctx.closePath(); ctx.fill();
    }
    const fl = ctx.createRadialGradient(sx, y + 6, 6, sx, y + 6, 190 * ouv); fl.addColorStop(0, `rgba(255,236,170,${0.65 * ouv})`); fl.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.save(); ctx.translate(0, y + 6); ctx.scale(1, 0.2); ctx.translate(0, -(y + 6)); ctx.fillStyle = fl; ctx.fillRect(sx - 200, y - 200, 400, 420); ctx.restore();
    for (let k = 0; k < 34; k++) {                       // des étincelles : elles sortent de la porte et montent en tournoyant
      const ph = ((tt * (0.22 + 0.12 * hasard(k)) + hasard(k + 3)) % 1), ex = sx + Math.sin(ph * 6 + k) * (14 + 70 * ph) * (hasard(k + 5) < 0.5 ? -1 : 1), ey = y - 30 - ph * (200 + 120 * hasard(k + 7));
      etoile4(ex, ey, (2 + 4 * hasard(k + 1)) * (1 - ph * 0.4), Math.sin(ph * Math.PI) * ouv);
    }
    ctx.restore();
  }
}
function dessinerDisparition(t) {                        // le chevalier se dissout dans la lumière de la porte
  if (porte.etat !== 'entree') return;
  const k = Math.min(1, porte.t / 1.6), tt = t / 1000, hx = heros.x - camX, hy = heros.y - 50;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = 50 + 150 * Math.sin(k * Math.PI * 0.9), g = ctx.createRadialGradient(hx, hy, 4, hx, hy, r); g.addColorStop(0, `rgba(255,255,255,${0.95 * Math.sin(k * Math.PI)})`); g.addColorStop(0.5, `rgba(255,225,160,${0.5 * Math.sin(k * Math.PI)})`); g.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = g; ctx.fillRect(hx - r, hy - r, r * 2, r * 2);
  const col = ctx.createLinearGradient(0, hy - 150, 0, hy + 60); col.addColorStop(0, 'rgba(255,245,210,0)'); col.addColorStop(0.5, `rgba(255,245,210,${0.55 * Math.sin(k * Math.PI)})`); col.addColorStop(1, 'rgba(255,245,210,0)');
  ctx.fillStyle = col; ctx.fillRect(hx - 20 * (1 - k * 0.5), hy - 150, 40 * (1 - k * 0.5), 210);                      // une colonne de lumière
  for (let i = 0; i < 26; i++) { const ph = (k * 1.2 + hasard(i)) % 1; etoile4(hx + Math.sin(ph * 7 + i) * 34, hy + 40 - ph * 170, 2 + 4 * hasard(i + 2), (1 - ph) * Math.sin(k * Math.PI)); }   // il s'envole en étincelles
  ctx.restore();
}