/* =====================================================
   ÉTAPE 1 : BASE DU JEU
   - un canvas de 960x540 (le CSS l'adapte à l'écran)
   - une boucle de jeu : update() puis draw(), ~60 fois/s
   ===================================================== */
const canvas = document.getElementById('jeu');
const ctx = canvas.getContext('2d');
let W = canvas.width;                    // largeur du jeu : change selon la fenêtre (voir redimensionner)
const H = canvas.height;                 // hauteur du jeu : toujours 540
const P = 1920;                          // largeur maximale du jeu = largeur d'une "tuile" de décor
const SOL_Y = 450;                       // hauteur du sol (le personnage marchera dessus)
const TAU = Math.PI * 2;
const reduireMouvement = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Petit générateur aléatoire "à graine" : le décor est identique à chaque lancement
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function nouveauCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* ---------- Plein écran : le jeu remplit tout l'onglet ----------
   On garde la hauteur de jeu (540) et on adapte la LARGEUR au format de la fenêtre.
   Fenêtre très étroite (téléphone en portrait) : on garde 640 de large minimum, avec des bandes en haut/bas. */
const cadre = document.getElementById('cadre');
const ECRAN_MAX = 1120;                                // largeur maximale de l'écran de jeu en pixels
const COLONNE = 156;                                   // colonnes de cartes (mode normal)
const COLONNE_COMPACT = 112;                           // colonnes de cartes (paysage sur petit écran)
const RESERVE_PORTRAIT = 238;                          // hauteur réservée sous le jeu en portrait : tailles + filtres + message
const RESERVE_TACTILE = 78;                            // + la place des boutons tactiles
let K = 1;                                             // finesse du dessin
function redimensionner() {
  const iw = innerWidth, ih = innerHeight;
  const portrait = ih > iw * 1.05;                     // téléphone / tablette tenu droit
  const compact = !portrait && (iw < 1000 || ih < 640); // paysage sur petit écran
  const tactile = matchMedia('(hover: none)').matches;
  document.body.classList.toggle('portrait', portrait);
  document.body.classList.toggle('compact', compact);

  let largeur, hauteur, echelle;
  if (portrait) {                                      // le jeu prend toute la largeur ; les cartes passent dessous
    largeur = Math.min(iw - 8, ECRAN_MAX);
    hauteur = ih - RESERVE_PORTRAIT - (tactile ? RESERVE_TACTILE : 0);
    echelle = Math.min(hauteur / H, largeur / 640);    // 640 unités de large minimum : le jeu reste lisible
  } else {
    const col = compact ? COLONNE_COMPACT : COLONNE;
    largeur = Math.max(compact ? 300 : 420, Math.min(iw - 2 * col, ECRAN_MAX));
    hauteur = ih - (compact ? 8 + 46 : 24 + 58);       // la ligne de message est sous l'écran
    echelle = Math.min(hauteur / H, largeur / 960);
  }
  W = Math.min(P, Math.round(largeur / echelle));
  K = Math.min(1.5, Math.max(1, echelle * (window.devicePixelRatio || 1)));
  canvas.width = Math.round(W * K); canvas.height = Math.round(H * K);
  cadre.style.width = W * echelle + 'px'; cadre.style.height = H * echelle + 'px';
  document.documentElement.style.setProperty('--bas', '12px');
  document.documentElement.style.setProperty('--cadre-w', W * echelle + 'px');
}
addEventListener('resize', redimensionner);
addEventListener('orientationchange', () => setTimeout(redimensionner, 200));   // certains téléphones se trompent de taille pendant la rotation
redimensionner();

/* =====================================================
   ÉTAPE 2 : LE DÉCOR (voir decor.js : forêt en pixel art, couches en parallaxe)
   ===================================================== */
let decor = null;                                  // fabriqué pour chaque niveau (voir niveaux.js et decor.js)

// --- Nuages (animés) et lucioles (particules magiques)
const rn = rng(5);
const nuages = Array.from({ length: 7 }, () => ({ x: rn() * P, y: 40 + rn() * 170, s: 0.6 + rn(), v: 4 + rn() * 8 }));
const lucioles = Array.from({ length: 36 }, () => ({
  x: rn() * P, y: 250 + rn() * 190, a: rn() * TAU, v: 6 + rn() * 14, ph: rn() * TAU
}));

/* =====================================================
   ÉTAPE 3 : LE HÉROS (avance, saute, la caméra le suit)
   ===================================================== */
let camX = 0;                                   // décalage du monde, maintenant piloté par le héros
// Le héros reste à 30 % de la largeur de l'écran (W * 0.3)
const GRAVITE = 1900, VIT_MAX = 330, SAUT = -720;   // réglages : gravité, vitesse de marche, force du saut
// Le héros vit dans le MONDE (x = distance parcourue). Son x à l'écran = x - camX.
const heros = { x: 120, y: SOL_Y, vx: 0, vy: 0, auSol: true, sens: 1, marche: 0, enfonce: 0, ralenti: 1, tombe: false };   // enfonce = profondeur dans le sable, ralenti = coefficient de vitesse

/* ----- TON PERSONNAGE : mets ton image PNG (fond transparent) dans le dossier assets/ -----
   Si le fichier n'existe pas, on garde l'elfe dessiné par code. */
const SPRITE = {
  fichier: 'assets/heros.png',
  hauteur: 110,            // hauteur du héros dans le jeu (l'elfe fait environ 105)
  images: 1,               // nombre d'images côte à côte dans le fichier (1 = image fixe, 4 = planche de 4 poses)
  regardeADroite: true     // mets false si ton dessin regarde vers la gauche
};
const imgHeros = new Image(); let spritePret = false;
imgHeros.onload = () => spritePret = true;
imgHeros.src = SPRITE.fichier;

// Entrées : clavier ET boutons tactiles remplissent le même tableau "touches"
const touches = {};
const NOMS = { droite: ['arrowright', 'd', 'droite'], gauche: ['arrowleft', 'q', 'a', 'gauche'], saut: [' ', 'arrowup', 'z', 'w', 'saut'], action: ['e', 'enter', 'action'], bas: ['arrowdown', 's', 'c', 'bas'] };
const veut = action => NOMS[action].some(k => touches[k]);
addEventListener('keydown', e => { touches[e.key.toLowerCase()] = true; if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault(); });
addEventListener('keyup',   e => touches[e.key.toLowerCase()] = false);
document.querySelectorAll('#commandes button').forEach(b => {
  b.addEventListener('pointerdown', e => { e.preventDefault(); touches[b.dataset.k] = true; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => touches[b.dataset.k] = false));
});

// Dessin du héros : un petit elfe à lunettes magiques (origine = ses pieds)
function dessinerHeros() {                        // le héros est "coupé" au niveau du sol quand il s'enfonce dans le sable
  ctx.save();
  ctx.imageSmoothingEnabled = true;                 // le héros (surtout ton image) reste lisse
  if (heros.enfonce > 0) { ctx.beginPath(); ctx.rect(0, 0, W, SOL_Y + 10); ctx.clip(); }
  dessinerHerosBrut();
  ctx.restore();
}
function dessinerHerosBrut() {
  const sx = heros.x - camX, sy = heros.y + 10 + heros.enfonce, h = SOL_Y - heros.y;   // h = hauteur au-dessus du sol
  ctx.fillStyle = 'rgba(0,0,0,0.25)';                                   // ombre : rétrécit quand il saute
  ctx.beginPath(); ctx.ellipse(sx, SOL_Y + 12, Math.max(8, 20 - h / 8), 5, 0, 0, TAU); ctx.fill();
  if (spritePret) {                                                     // --- ton image à la place de l'elfe
    const fw = imgHeros.width / SPRITE.images, fh = imgHeros.height;     // taille d'UNE pose
    const hh = SPRITE.hauteur, ww = hh * fw / fh;                        // on garde les proportions
    const marche = heros.auSol && Math.abs(heros.vx) > 10;
    const pose = SPRITE.images > 1 && marche ? Math.floor(heros.marche / 1.5) % SPRITE.images : 0;   // enchaîne les poses en marchant
    const rebond = SPRITE.images === 1 && marche ? -Math.abs(Math.sin(heros.marche)) * 5 : 0;       // image fixe : petit rebond
    ctx.save(); ctx.translate(sx, heros.y + 10 + heros.enfonce + rebond);
    ctx.scale(heros.sens * (SPRITE.regardeADroite ? 1 : -1), 1);
    ctx.drawImage(imgHeros, pose * fw, 0, fw, fh, -ww / 2, -hh, ww, hh);
    ctx.restore(); return;
  }
  if (typeof dessinerPrince === 'function') { dessinerPrince(sx, sy); return; }    // le prince (prince.js)
  ctx.save(); ctx.translate(sx, sy); ctx.scale(heros.sens, 1);          // scale(-1) = il regarde à gauche
  const bouge = Math.abs(heros.vx) > 10;
  const pas = heros.auSol ? (bouge ? Math.sin(heros.marche) : 0) : 0.8;  // balancement des jambes/bras
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4b3a8f'; ctx.lineWidth = 7;                       // jambes
  ctx.beginPath(); ctx.moveTo(-5, -22); ctx.lineTo(-5 + pas * 11, -2); ctx.moveTo(6, -22); ctx.lineTo(6 - pas * 11, -2); ctx.stroke();
  const ond = Math.sin(heros.marche * 0.8) * 4, trainee = Math.abs(heros.vx) / 14;
  ctx.fillStyle = '#e0559a';                                            // cape qui flotte derrière
  ctx.beginPath(); ctx.moveTo(-8, -54); ctx.quadraticCurveTo(-26 - trainee, -34 + ond, -22 - trainee, -8 + ond); ctx.lineTo(-6, -22); ctx.fill();
  ctx.fillStyle = '#2ec4b6'; ctx.beginPath(); ctx.roundRect(-12, -56, 24, 36, 8); ctx.fill();   // tunique
  ctx.fillStyle = '#ffd166'; ctx.fillRect(-12, -36, 24, 5);                                      // ceinture
  ctx.strokeStyle = '#ffd9b8'; ctx.lineWidth = 5;                                                // bras
  ctx.beginPath(); ctx.moveTo(2, -48); ctx.lineTo(10 + pas * 8, -34 - (heros.auSol ? 0 : 10)); ctx.stroke();
  ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(0, -70, 15, 0, TAU); ctx.fill();           // tête
  ctx.fillStyle = '#e0559a';                                                                     // chapeau pointu
  ctx.beginPath(); ctx.moveTo(-16, -74); ctx.quadraticCurveTo(-4, -92, -12 - trainee / 3, -104); ctx.quadraticCurveTo(10, -92, 16, -74); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd166'; ctx.fillRect(-16, -76, 32, 4);
  // lunettes magiques : verres bleutés avec petit reflet
  ctx.strokeStyle = '#ffcf5a'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(160,240,255,0.6)';
  [2, 12].forEach(x => { ctx.beginPath(); ctx.arc(x, -68, 5.5, 0, TAU); ctx.fill(); ctx.stroke(); });
  ctx.beginPath(); ctx.moveTo(7.5, -68); ctx.lineTo(6.5, -68); ctx.stroke();
  ctx.fillStyle = '#fff'; [0.5, 10.5].forEach(x => { ctx.beginPath(); ctx.arc(x, -70, 1.4, 0, TAU); ctx.fill(); });
  ctx.fillStyle = '#3a2146'; [4, 14].forEach(x => { ctx.beginPath(); ctx.arc(x, -67.5, 1.6, 0, TAU); ctx.fill(); });
  ctx.strokeStyle = '#b5654f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(9, -61, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();   // sourire
  ctx.restore();
}

/* =====================================================
   ÉTAPE 4 : INTERFACE (outils, vies, chrono, progression)
   Les boutons sont en HTML par-dessus le canvas : plus faciles à styliser et à toucher.
   Pour l'instant ils changent l'état du jeu ; ils agiront sur les pièges aux étapes 5 et 6.
   ===================================================== */
let LONGUEUR_NIVEAU = 6000;              // distance (px) entre le départ et le portail de sortie (change avec le niveau)
let lunettes = false, lunettesAlpha = 0; // lunettes on/off + fondu progressif
let outilActif = null;                   // 'flou' | 'ouverture' | 'fermeture' | 'vapeur' | null
let vies = 3, temps = 0, derniereSeconde = -1;

const AIDE = {};                                          // la bulle qui s'affiche quand on choisit un filtre : « Nom : explication » (voir filtres.js)
Object.keys(FILTRES_JEU).forEach(k => { AIDE[k] = FILTRES_JEU[k].nom + ' : ' + FILTRES_JEU[k].info; });
const elBulle = document.getElementById('bulle'); let minuteurBulle;
function montrerBulle(txt) {
  elBulle.textContent = txt; elBulle.classList.add('visible');
  clearTimeout(minuteurBulle); minuteurBulle = setTimeout(() => elBulle.classList.remove('visible'), 6000);
}
function majOutils() {                    // reflète l'état dans les boutons (aria-pressed = bouton enfoncé)
  document.querySelectorAll('.outil').forEach(b =>
    b.setAttribute('aria-pressed', b.dataset.outil === 'lunettes' ? lunettes : b.dataset.outil === outilActif));
}
/* Le nom et la courte description de chaque carte viennent de filtres.js */
document.querySelectorAll('.outil').forEach(b => {
  const F = FILTRES_JEU[b.dataset.outil]; if (!F) return;
  const nom = b.querySelector('b'), desc = b.querySelector('.carte-desc');
  if (nom) nom.textContent = F.nom; if (desc) desc.textContent = F.court || ''; b.title = F.nom + ' : ' + F.info;
});
function choisirOutil(nom) {
  if (nom === 'vapeur' && !HUMAINS_ACTIFS) return;
  if (typeof filtreDisponible === 'function' && !filtreDisponible(nom)) return;                 // ce filtre n'existe pas encore dans ce niveau                  // pas d'humains pour l'instant : la vapeur est inutile              // re-cliquer sur l'outil actif le range
  outilActif = outilActif === nom ? null : nom; majOutils(); Son.jouer('carte');
}
function basculerLunettes() {
  lunettes = !lunettes; majOutils(); if (lunettes) Son.jouer('lunettes');
  montrerBulle(lunettes ? AIDE.lunettes : "Lunettes enlevées : les pièges redeviennent invisibles…");
}
document.querySelectorAll('.outil').forEach(b => b.addEventListener('click', () => {
  const o = b.dataset.outil;
  if (o === 'lunettes') basculerLunettes(); else choisirOutil(o);
  b.blur();                               // sinon la barre Espace "reclique" le bouton au lieu de seulement sauter
}));
addEventListener('keydown', e => {        // raccourcis : L = lunettes, 1 à 4 = outils
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'l') basculerLunettes();
  if (k === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();   // vrai plein écran
  const i = '1234567'.indexOf(k);
  if (k.length === 1 && i >= 0) choisirOutil(['flou', 'ouverture', 'fermeture', 'gaussien', 'nettete', 'contours', 'vapeur'][i]);
});

const elCoeurs = document.getElementById('coeurs'), elChrono = document.getElementById('chrono');
const elTrace = document.getElementById('trace'), elMarqueur = document.getElementById('marqueur');
function majCoeurs() { elCoeurs.textContent = niveauActuel.entrainement ? '∞' : '❤️'.repeat(vies) + '🤍'.repeat(3 - vies); elCoeurs.setAttribute('aria-label', niveauActuel.entrainement ? 'vies illimitées' : vies + ' vies'); }
function perdreVie() {
  if (niveauActuel.entrainement) { Son.jouer('echec'); montrerBulle("Raté… mais c'est l'entraînement : tu ne perds pas de vie !"); return; }     // à l'entraînement, on ne perd jamais de vie
  vies = Math.max(0, vies - 1); majCoeurs(); Son.jouer('degat');
}   // les pièges l'appelleront à l'étape 6 (testable dans la console F12)
function progression() { return Math.min(1, Math.max(0, (heros.x - 120) / (LONGUEUR_NIVEAU - 120))); }   // 0 = départ, 1 = château
function majHUD(dt) {
  temps += dt;
  const s = Math.floor(temps);
  if (s !== derniereSeconde) { derniereSeconde = s; elChrono.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  const p = progression() * 100;
  elTrace.style.width = p + '%'; elMarqueur.style.left = p + '%';
  lunettesAlpha += ((lunettes ? 1 : 0) - lunettesAlpha) * Math.min(1, dt * 8);   // fondu en douceur
}
majCoeurs(); majOutils();

// Dessine une couche qui se répète à l'infini, décalée selon sa vitesse de parallaxe
function dessinerCouche(img, vitesse, y = 0) {
  const x = -((camX * vitesse) % P);
  ctx.drawImage(img, x, y); ctx.drawImage(img, x + P, y);
}

function dessinerNuage(n) {                        // nuage doux : plusieurs bouffées dégradées, éclairées par la lune
  [[0, 0, 60], [50, -12, 48], [100, 2, 56], [48, 10, 50]].forEach(([dx, dy, r]) => {
    const x = n.px + dx * n.s, y = n.y + dy * n.s, rr = r * n.s, g = ctx.createRadialGradient(x - rr * 0.2, y - rr * 0.3, 0, x, y, rr);
    g.addColorStop(0, 'rgba(150,160,205,0.38)'); g.addColorStop(1, 'rgba(90,100,150,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, 2 * rr, 2 * rr);
  });
}

/* =====================================================
   BOUCLE DE JEU
   update(dt) : fait évoluer le monde  (dt = secondes écoulées)
   draw(t)    : dessine l'image courante, de l'arrière vers l'avant
   ===================================================== */
function animerAmbiance(dt) {                      // nuages et lucioles continuent de bouger, même quand le jeu est en pause
  if (reduireMouvement) return;
  nuages.forEach(n => n.x = (n.x + n.v * dt) % (W + 260));
  lucioles.forEach(l => { l.a += (Math.random() - 0.5) * 2.2 * dt; l.x += Math.cos(l.a) * l.v * dt; l.y += Math.sin(l.a) * l.v * dt;
    l.x = (l.x + W) % W; l.y = Math.min(445, Math.max(230, l.y)); });
}

function update(dt) {
  if (confirmOuvert || aideOuvert) { animerAmbiance(dt); return; }   // la boîte « Quitter ? » ou l'aide est ouverte : pause
  if (introOuvert) { animerAmbiance(dt); majIntro(dt); return; }   // l'histoire d'introduction : pause aussi
  if (accueilOuvert) { animerAmbiance(dt); return; }   // accueil ouvert : pause aussi, mais le décor vit derrière
  if (ecranOuvert) return;                      // écran de fin de niveau : pause aussi
  heros.accroupi = heros.auSol && heros.enfonce === 0 && (veut('bas') || heros.forceBas); heros.forceBas = false;   // accroupi (↓ / S), ou forcé sous un buisson
  let dir = (veut('droite') ? 1 : 0) - (veut('gauche') ? 1 : 0);            // -1, 0 ou +1
  if (heros.auto) {                                                         // « E » : le chevalier avance tout seul dans le passage, sans les flèches
    dir = performance.now() >= heros.auto.apres ? 1 : 0;
    if (heros.x >= heros.auto.cible) heros.auto = null;
  } else if (animationEnCours()) dir = 0;                                   // pendant que le filtre glisse, il attend
  if (porte.etat === 'entree') dir = 0;                                     // devant la porte, il ne bouge plus
  heros.vx += (dir * VIT_MAX * heros.ralenti * (heros.accroupi ? 0.5 : 1) - heros.vx) * Math.min(1, dt * (heros.auSol ? 10 : 4));   // accélère/freine en douceur
  if (dir) heros.sens = dir;
  if (veut('saut') && heros.auSol && heros.enfonce === 0 && !heros.accroupi && !heros.auto && !animationEnCours() && !niveauActuel.entrainement && porte.etat === 'fermee' && !sautInterdit()) { heros.vy = SAUT; heros.auSol = false; Son.jouer('saut'); }           // saut : seulement depuis le sol
  heros.vy += GRAVITE * dt;                                                           // la gravité tire toujours vers le bas
  const xAvant = heros.x, yAvant = heros.y;
  heros.x = Math.min(LONGUEUR_NIVEAU, Math.max(40, heros.x + heros.vx * dt));
  pousserParRochers(xAvant);                            // les rochers sont des murs : il faut sauter par-dessus
  heros.y += heros.vy * dt;
  const appui = heros.tombe ? null : supportSous(yAvant);   // une plateforme ou un rocher sous les pieds ?
  if (appui !== null) { heros.y = appui; heros.vy = 0; heros.auSol = true; }
  else if (heros.y >= SOL_Y && !heros.tombe) {              // le sol ou... un trou ouvert (surTrou : voir pieges.js)
    if (surTrou()) { heros.tombe = true; heros.auSol = false; Son.jouer('chute'); }
    else { heros.y = SOL_Y; heros.vy = 0; heros.auSol = true; }
  }        // atterrissage
  heros.marche += Math.abs(heros.vx) * dt * 0.05;                                      // fait avancer l'animation de marche
  camX += (Math.max(0, heros.x - W * 0.3) - camX) * Math.min(1, dt * 8);              // la caméra suit en douceur
  majPieges(dt);
  majMonde(dt);
  majHumains(dt);
  majNiveau(dt);
  majTuto(dt);
  majHUD(dt);
  animerAmbiance(dt);
}

function draw(t) {
  ctx.setTransform(K, 0, 0, K, 0, 0);               // on dessine toujours en coordonnées de jeu (960 de large) ; K rend le dessin plus fin
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(decor.ciel, 0, 0);
  if (decor.lune) {                                  // la lune (cimetière)
    const lx = W * 0.56, hc = decor.halo.join(','), halo = ctx.createRadialGradient(lx, 70, 10, lx, 70, 280);
    halo.addColorStop(0, `rgba(${hc},0.55)`); halo.addColorStop(1, `rgba(${hc},0)`);
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H); ctx.drawImage(decor.lune, lx - 50, 20);
  }
  if (decor.nuages) nuages.forEach(n => { n.px = ((n.x - camX * 0.04) % (W + 260) + W + 260) % (W + 260) - 130; dessinerNuage(n); });
  decor.couches.forEach(c => dessinerCouche(c.img, c.v));
  dessinerFeux(t);                                   // flammes des braseros et des bougies
  const bc = decor.brume.join(','), brume = ctx.createLinearGradient(0, SOL_Y - 110, 0, SOL_Y);   // brume au pied du décor
  brume.addColorStop(0, `rgba(${bc},0)`); brume.addColorStop(1, `rgba(${bc},0.22)`);
  ctx.fillStyle = brume; ctx.fillRect(0, SOL_Y - 110, W, 110);
  if (decor.rayons) rayonsDeSoleil(t);
  dessinerCouche(decor.sol, 1);
  dessinerPortail(t);                                // le portail de sortie du niveau
  dessinerMonde(t);                                  // plateformes, rochers, trésors cachés et pièces
  dessinerPieges(t);
  dessinerHumains(t);
  if (porte.etat === 'entree') { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - porte.t / 1.2); dessinerHeros(); ctx.restore(); }   // il s'efface dans la lumière...
  else dessinerHeros();
  dessinerDisparition(t);                            // ...en laissant une colonne de lumière et des étincelles
  dessinerIntroScene(t);                             // la princesse de l'histoire
  dessinerVapeur(t);
  dessinerCouche(decor.avant, 1.3);                 // herbes du premier plan, devant le héros
  // lucioles : petits points lumineux qui clignotent
  ctx.globalCompositeOperation = 'lighter';
  lucioles.forEach(l => {
    const lum = 0.5 + 0.5 * Math.sin(t / 600 + l.ph);
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 16);
    g.addColorStop(0, `rgba(${decor.particule},${lum})`); g.addColorStop(1, `rgba(${decor.particule},0)`);
    ctx.fillStyle = g; ctx.fillRect(l.x - 16, l.y - 16, 32, 32);
  });
  const hx = heros.x - camX, hy = heros.y - 40;                    // une lueur chaude autour du héros : il fait sombre !
  const lan = ctx.createRadialGradient(hx, hy, 10, hx, hy, 190);
  lan.addColorStop(0, 'rgba(255,200,120,0.20)'); lan.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = lan; ctx.fillRect(hx - 190, hy - 190, 380, 380);
  ctx.globalCompositeOperation = 'source-over';
  const ombre = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);   // bords assombris
  ombre.addColorStop(0, 'rgba(0,0,12,0)'); ombre.addColorStop(1, 'rgba(0,0,12,0.55)');
  ctx.fillStyle = ombre; ctx.fillRect(0, 0, W, H);
  if (lunettesAlpha > 0.01) {             // vision magique : léger voile bleuté + bords lumineux
    ctx.save(); ctx.globalAlpha = lunettesAlpha;
    ctx.fillStyle = 'rgba(120,230,255,0.10)'; ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(60,200,255,0)'); v.addColorStop(1, 'rgba(30,140,255,0.45)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}

let dernier = performance.now();
function boucle(maintenant) {
  const dt = Math.min(0.05, (maintenant - dernier) / 1000);   // on limite dt si l'onglet était en pause
  dernier = maintenant;
  update(dt); draw(maintenant);
  requestAnimationFrame(boucle);
}
chargerNiveau(0); majAccueil();                    // on charge le niveau 1 derrière l'accueil
requestAnimationFrame(boucle);