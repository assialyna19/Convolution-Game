/* =====================================================
   L'ENTRAÎNEMENT : le guide
   Un parcours facile et sans risque (voir ENTRAINEMENT dans niveaux.js) : 3 trous de plus en plus grands, 2 buissons.
   Le guide affiche un conseil à la fois en haut de l'écran, et fait clignoter les cartes à utiliser. Il passe au conseil
   suivant quand l'exercice est réussi. On peut se tromper autant qu'on veut : on ne perd jamais de vie.
   ===================================================== */
let tutoActif = false, tutoEtape = 0, tutoDelai = 0;
const elTuto = document.getElementById('tuto'), elTutoTexte = document.getElementById('tuto-texte'), elTutoNum = document.getElementById('tuto-num');

const proche = (i, d) => !!pieges[i] && heros.x > pieges[i].zx - d;                // le héros approche du piège numéro i
const resolu = i => !pieges[i] || pieges[i].etat === 'resolu';
const ETAPES = [
  { texte: "Bienvenue à l'entraînement ! Ici, tu ne perds aucune vie : tu peux te tromper. Avance avec les flèches ← →.", fait: () => heros.x > 340 },
  { texte: "Mets tes lunettes magiques : touche L. Tu vois alors les pièges comme des grilles de petits carrés.", fait: () => lunettes, cartes: ['lunettes'] },
  { texte: "Du sable mouvant ! Choisis une taille de carte à gauche, la Brume à droite, puis appuie sur E. Regarde la carte glisser doucement sur les carrés !", quand: () => proche(0, 560), fait: () => resolu(0), cartes: ['fenetre', 'flou'] },
  { texte: "Un trou de 2 cases. Compte ses carrés ! Ta carte doit être plus grande que le trou. Choisis la bonne carte, le Mortier, puis E.", quand: () => proche(1, 560), fait: () => resolu(1), cartes: ['fenetre', 'fermeture'] },
  { texte: "Un trou de 4 cases ! La petite carte (3) est trop petite… Essaie la carte moyenne (5) ou la carte suprême (7).", quand: () => proche(2, 560), fait: () => resolu(2), cartes: ['fenetre', 'fermeture'] },
  { texte: "Un trou de 6 cases : seule la carte suprême (7) est plus grande que lui !", quand: () => proche(3, 560), fait: () => resolu(3), cartes: ['fenetre', 'fermeture'] },
  { texte: "Un buisson ! Choisis la Faucille. Une petite carte suffit pour couper les fines tiges et ouvrir un passage.", quand: () => proche(4, 560), fait: () => resolu(4), cartes: ['fenetre', 'ouverture'] },
  { texte: "Des tiges plus épaisses (3 cases) : la petite carte ne les coupe pas. Essaie la carte moyenne !", quand: () => proche(5, 560), fait: () => resolu(5), cartes: ['fenetre', 'ouverture'] }
];

function carteEl(nom) { return nom === 'fenetre' ? document.getElementById('fenetres') : document.querySelector(`[data-outil="${nom}"]`); }
function surligner(noms) { document.querySelectorAll('.conseil').forEach(c => c.classList.remove('conseil')); (noms || []).forEach(n => { const c = carteEl(n); if (c) c.classList.add('conseil'); }); }
function demarrerTuto() { tutoActif = true; tutoEtape = 0; tutoDelai = 4; elTuto.classList.remove('visible'); }
function arreterTuto() { tutoActif = false; elTuto.classList.remove('visible'); surligner([]); }
function finTuto(reussi) {
  arreterTuto();
  if (reussi) montrerBulle("Bravo ! Plus l'obstacle est grand, plus la carte doit être grande. Rejoins le portail !");
}
function majTuto(dt) {
  if (!tutoActif) return;
  if (!niveauActuel.entrainement) { arreterTuto(); return; }
  if (tutoDelai > 0) { tutoDelai -= dt; return; }                          // on laisse le bandeau s'afficher d'abord
  while (tutoEtape < ETAPES.length && ETAPES[tutoEtape].fait() && (!ETAPES[tutoEtape].quand || ETAPES[tutoEtape].quand())) tutoEtape++;   // les exercices déjà réussis sont sautés
  const e = ETAPES[tutoEtape];
  if (!e) { finTuto(true); return; }
  if (e.quand && !e.quand()) { elTuto.classList.remove('visible'); surligner([]); return; }                                              // pas encore le moment
  elTutoNum.textContent = 'Entraînement ' + (tutoEtape + 1) + '/' + ETAPES.length; elTutoTexte.textContent = e.texte;
  elTuto.classList.add('visible'); surligner(e.cartes);
}
document.getElementById('tuto-passer').addEventListener('click', e => { arreterTuto(); e.currentTarget.blur(); });