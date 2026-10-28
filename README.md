# La Quête des Lunettes Magiques

**Un jeu éducatif pour comprendre la convolution et la morphologie mathématique, en jouant.**

![HTML5](https://img.shields.io/badge/HTML5-Canvas-e34f26?logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?logo=javascript&logoColor=black)
![Dépendances](https://img.shields.io/badge/dépendances-0-brightgreen)
![Public](https://img.shields.io/badge/public-10--14%20ans-blueviolet)

</div>

<!-- Ajoutez ici une capture d'écran ou un GIF :
<p align="center"><img src="docs/screenshot.png" width="720" alt="Capture du jeu"></p>
-->

## À propos

Le prince doit sauver la princesse en traversant 5 mondes pleins de pièges. Avec ses **lunettes magiques**, le monde devient une **grille de carrés** (des nombres). Chaque piège (trou, buisson, sable, tornade…) est un problème d'image, et le joueur le résout en choisissant le bon **filtre** et la bonne **taille de carte** qui glisse sur la grille.

> **Objectif pédagogique :** permettre aux enfants de 10 à 14 ans de comprendre visuellement comment une opération de **convolution** ou de **morphologie mathématique** permet de **détecter, analyser et résoudre** un piège.

## Fonctionnalités

- Jeu de plateforme 2D, 5 niveaux + mode **Entraînement** sans risque
- Vrai moteur de convolution : les résultats sont **calculés**, jamais truqués
- Vue « Entrée → Filtre → Résultat » avec le calcul de chaque case en direct
- Explication après chaque essai : pourquoi ça marche ou non
- Les cartes coûtent des pièces : il faut choisir la **plus petite qui suffit**
- **Bilan d'apprentissage** exportable en CSV (données gardées dans le navigateur)
- Clavier, souris et tactile · musique et sons générés par le code · aucun asset requis

## Démarrage rapide

Aucune installation ni compilation.

```bash
git clone <url-du-depot>
cd projet_atelier
# ouvrir index.html dans un navigateur récent
```

Ou, avec un petit serveur local :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

> Les polices viennent de Google Fonts (connexion requise, sinon polices de secours).
> Gardez tous les fichiers dans le même dossier ; un fichier manquant s'affiche en rouge en bas de l'écran.

## Comment jouer

1. **`L`** : mettre les lunettes pour voir le piège en grille
2. **`T`** : choisir la taille de la carte (3×3, 5×5 ou 7×7)
3. **`1`–`6`** : choisir le filtre
4. **`E`** : lancer. La carte glisse, puis le prince avance. Mauvais choix = un cœur en moins (3 par niveau)

| Action | Touches |
|---|---|
| Bouger / sauter / s'accroupir | `←` `→` · `Espace` ou `↑` · `↓` |
| Lunettes · taille · lancer | `L` · `T` · `E` |
| Son · pause · plein écran | `M` · `Échap`/`P` · `F` |

## Les maths en bref

Chaque piège est associé au filtre qui le résout :

| Piège | Filtre (nom du jeu) | Opération | Touche |
|---|---|---|---|
| Sable mouvant | Brume | flou (moyenne) | `1` |
| Buisson épineux | Faucille | ouverture (érosion → dilatation) | `2` |
| Trou | Mortier | fermeture (dilatation → érosion) | `3` |
| Tornade | Berceuse | flou gaussien | `4` |
| Brouillard | Lynx | netteté | `5` |
| Mur lisse (porte secrète) | Fusain | gaussien + Laplacien (contours) | `6` |

**Convolution :** une petite grille (le noyau) glisse sur l'image ; pour chaque case, on multiplie les voisines par leurs poids et on additionne.
**Morphologie :** l'érosion garde `1` si *toutes* les cases sous la fenêtre sont pleines ; la dilatation donne `1` si *au moins une* l'est.

**La règle d'or :** la taille de la carte compte. Pour un trou de largeur *L*, la carte doit être plus grande que *L*. Pour un buisson, plus grande que les tiges mais pas que la voûte.

> Note : L'érosion et la dilatation sont de la morphologie, pas des convolutions classiques. Le jeu le précise à l'écran.

## Niveaux

| # | Monde | Difficulté | Nouveauté |
|---|---|---|---|
| 1 | La forêt des lucioles | Facile | Brume, Mortier, Faucille |
| 2 | La forêt enchantée | Moyen | Tornade et Berceuse |
| 3 | Le marais pourpre | Difficile | Brouillard et Lynx |
| 4 | Le donjon | Très difficile | Mur lisse et Fusain |
| 5 | La cathédrale des vitraux | Cauchemar | Synthèse de tout |

## Structure du projet

```
├── index.html        # page et ordre de chargement des scripts
├── style.css         # styles
├── convolution.js    # moteur mathématique (fonctions pures)
├── filtres.js        # noms et explications des filtres
├── pieges.js         # sable, trou, buisson
├── pieges2.js        # tornade, mur, brouillard
├── matrices.js       # vue Entrée → Filtre → Résultat
├── niveaux.js        # niveaux et entraînement
├── stats.js          # bilan d'apprentissage
├── tuto.js           # guide de l'entraînement
├── jeu.js            # boucle de jeu (à charger en dernier)
├── monde.js · decor.js · prince.js · princesse.js
├── accueil.js · intro.js · son.js
└── humains.js        # désactivé (HUMAINS_ACTIFS = false)
```

`aide.js`, `enigmes.js` et `labo.js` sont des modules optionnels, non chargés par défaut.

## Personnalisation

| Je veux… | Fichier |
|---|---|
| Modifier un niveau (pièges, tailles, leçon) | `niveaux.js` |
| Changer un nom ou un texte de filtre | `filtres.js` |
| Changer le prix des cartes | `monde.js` (`COUT_CARTE`) |
| Ajouter un filtre | `convolution.js`, `filtres.js`, `pieges2.js` |
| Mettre son propre héros | `assets/heros.png` (PNG transparent, réglage `SPRITE` dans `jeu.js`) |

## Pistes d'amélioration

- [ ] Tester avec de vrais élèves (taux de bons choix au premier essai)
- [ ] Éditeur de pièges et mode « noyau libre »
- [ ] Tableau de bord enseignant
- [ ] Traductions (anglais, arabe…)

## Licence

À définir.
