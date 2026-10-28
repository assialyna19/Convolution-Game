/* =====================================================
   MOTEUR DE CONVOLUTION (fonctions pures : aucun dessin, aucun HTML)
   Il sert à la loupe magique (étape 5) et servira aux pièges du jeu (étapes 6 et 7).

   L'idée en une phrase : une petite fenêtre glisse sur l'image, case par case ;
   pour chaque case, on regarde les voisins sous la fenêtre et on en tire UNE valeur.
   Seule la façon de "tirer une valeur" change d'un filtre à l'autre.
   ===================================================== */

// Valeurs des cases sous une fenêtre n×n centrée en (x, y). Hors de l'image, on répète la case du bord.
function voisinsDe(g, w, h, x, y, n) {
  const r = (n - 1) / 2, v = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy));
    v.push(g[yy * w + xx]);
  }
  return v;
}

/* =====================================================
   UNE VRAIE CONVOLUTION : chaque voisin est multiplié par son poids dans la MATRICE DU FILTRE (le « noyau »), puis on additionne tout.
   Les trois filtres du jeu sont construits comme ça :
     • flou        : matrice où chaque case vaut 1/9 (ou 1/25, 1/49) -> la somme est la moyenne des voisins
     • rétrécir    : matrice de 1, puis seuil « la somme est-elle égale à n×n ? » (toutes les cases sont pleines)   = l'érosion
     • grossir     : matrice de 1, puis seuil « la somme est-elle d'au moins 1 ? » (une case pleine suffit)         = la dilatation
   Sur une image en 0/1, c'est exactement la même chose que « minimum » et « maximum » : seulement, ici on le calcule
   avec la vraie formule de la convolution (somme de poids × cases), suivie d'un seuil.
   ===================================================== */
function noyau(n, op) { return new Array(n * n).fill(op === 'moyenne' ? 1 / (n * n) : 1); }          // la matrice du filtre, à plat
function convoluerCase(vois, K) { let s = 0; for (let j = 0; j < K.length; j++) s += K[j] * vois[j]; return s; }   // somme de (poids × case)
const COTE = v => Math.round(Math.sqrt(v.length));                                                    // 9 voisins -> fenêtre 3×3, etc.
const OPERATIONS = {
  moyenne: v => { const K = noyau(COTE(v), 'moyenne'); return [0, 1, 2].map(c => Math.round(convoluerCase(v.map(p => p[c]), K))); },   // flou : convolution avec des 1/9, couleur par couleur
  moyenneNb: v => convoluerCase(v, noyau(COTE(v), 'moyenne')),                                       // la même chose pour de simples nombres (le scan de l'infection)
  minimum: v => convoluerCase(v, noyau(COTE(v), 'uns')) > v.length - 0.5 ? 1 : 0,                    // rétrécir (érosion) : somme = n×n ?  (toutes les cases pleines)
  maximum: v => convoluerCase(v, noyau(COTE(v), 'uns')) > 0.5 ? 1 : 0                                // grossir (dilatation) : somme ≥ 1 ?  (au moins une case pleine)
};
/* ---------- Trois nouveaux filtres : de vraies convolutions avec des poids qui ne sont PAS tous égaux ----------
     gaussien : le poids est plus fort au centre (triangle de Pascal : 1 2 1 / 1 4 6 4 1 / ...) -> un flou plus doux, qui calme l'agitation
     netteté  : (1+l) × (pixel du centre) − l × flou, avec l = 1, 2, 3 selon la carte -> on ajoute à chaque pixel ce qui dépasse de son voisinage : les détails ressortent
     contours : d'abord un gaussien (pour calmer le bruit), puis le Laplacien 3×3  0 1 0 / 1 −4 1 / 0 1 0  : il ne réagit qu'aux changements brusques */
function pascal(n) { let r = [1]; for (let i = 1; i < n; i++) { const s = [1]; for (let j = 1; j < i; j++) s.push(r[j - 1] + r[j]); s.push(1); r = s; } return r; }
function noyauGauss(n) { const b = pascal(n), tot = b.reduce((x, y) => x + y, 0), K = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) K.push(b[x] * b[y] / (tot * tot)); return K; }
function noyauNettete(n) { const l = (n - 1) / 2; return noyauGauss(n).map((w, i) => (i === (n * n - 1) / 2 ? 1 + l : 0) - l * w); }      // (1+l) × centre − l × flou : plus la carte est grande, plus la netteté est forte
const LAPLACE = [0, 1, 0, 1, -4, 1, 0, 1, 0];
Object.assign(OPERATIONS, {
  gauss: v => convoluerCase(v, noyauGauss(COTE(v))),
  nettete: v => convoluerCase(v, noyauNettete(COTE(v))),
  laplace3: v => Math.abs(convoluerCase(v, LAPLACE))                // l'intensité du contour (valeur absolue)
});
const TAILLE_FIXE = { laplace3: 3 };                               // le Laplacien est toujours 3×3, quelle que soit la carte choisie
const tailleDe = (op, n) => TAILLE_FIXE[op] || n;
function noyauAffiche(op, n) {                                      // les poids de la matrice, pour la colorier (négatif = rouge, positif = bleu)
  if (op === 'gauss') return noyauGauss(n); if (op === 'nettete') return noyauNettete(n); if (op === 'laplace3') return LAPLACE;
  return noyau(n, op);
}
// Pour l'affichage : la couleur de la matrice et ses mots, selon l'opération
const COULEUR_OP = { moyenne: '90,170,255', minimum: '255,120,70', maximum: '70,220,130', gauss: '80,200,200', nettete: '255,210,90', laplace3: '255,90,170' };
const NOM_OP = { moyenne: 'Flou', minimum: 'Rétrécir', maximum: 'Grossir', gauss: 'Gaussien', nettete: 'Netteté', laplace3: 'Contours' };

// Fait glisser la fenêtre sur toute l'image (g = tableau de w*h cases) et renvoie la nouvelle image
function balayer(g, w, h, n, op) {
  const sortie = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    sortie[y * w + x] = OPERATIONS[op](voisinsDe(g, w, h, x, y, n));
  return sortie;
}

// Un filtre = une suite d'opérations
const FILTRES = {
  flou: ['moyenne'],
  ouverture: ['minimum', 'maximum'],   // d'abord on rétrécit, puis on regonfle : les petits objets disparaissent
  fermeture: ['maximum', 'minimum'],   // d'abord on grossit, puis on rétrécit : les petits trous se bouchent
  gaussien: ['gauss'],                 // la tornade : on calme l'agitation
  nettete: ['nettete'],                // le brouillard : on fait ressortir les détails
  contours: ['gauss', 'laplace3']      // la porte secrète : on calme le bruit, puis on ne garde que les changements brusques
};