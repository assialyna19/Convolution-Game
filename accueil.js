/* =====================================================
   L'ACCUEIL : l'écran de départ
   - "Jouer" lance le niveau 1 (ou "Reprendre" si une partie est en cours : touche Échap pour revenir au menu)
   - "Niveaux" : choisir un niveau (les niveaux se débloquent un par un, la progression est gardée dans le navigateur)
   - "Aide" : explique les règles du jeu
   Quand l'accueil est ouvert, le jeu est en pause (voir update() dans jeu.js), mais le décor continue de vivre derrière.
   ===================================================== */
let accueilOuvert = true, jeuEnCours = false, niveauMax = 0;       // niveauMax = dernier niveau débloqué (0 = seulement le niveau 1)
try { niveauMax = +(localStorage.getItem('quete-niveau-max') || 0); } catch (e) { /* stockage indisponible : on continue sans */ }

const elAccueil = document.getElementById('accueil'), elNivEcran = document.getElementById('niveaux-ecran');
const btnJouer = document.getElementById('btn-jouer'), btnNouvelle = document.getElementById('btn-nouvelle'), btnReprendre = document.getElementById('btn-reprendre');

function majAccueil() {                                  // met l'écran en accord avec l'état (ouvert / fermé)
  document.body.classList.toggle('accueil', accueilOuvert);
  elAccueil.classList.toggle('ouvert', accueilOuvert);
  btnJouer.hidden = jeuEnCours;                          // en pause : le bouton « Reprendre » remplace le triangle vert
  btnReprendre.hidden = !jeuEnCours;
  btnNouvelle.hidden = !jeuEnCours;
}
function ouvrirAccueil() { accueilOuvert = true; elNivEcran.classList.remove('ouvert'); majAccueil(); }
function demarrer(i) {                                   // lance une partie au niveau i
  accueilOuvert = false; jeuEnCours = true; elNivEcran.classList.remove('ouvert');
  chargerNiveau(i); majAccueil();
  if (i < 0) demarrerTuto(); else arreterTuto();                       // à l'entraînement (niveau -1), le guide explique chaque exercice
}
function sauverProgres(nouveau) {                        // appelée à la fin d'un niveau : on débloque le suivant
  if (nouveau > niveauMax && nouveau < NIVEAUX.length) {
    niveauMax = nouveau;
    try { localStorage.setItem('quete-niveau-max', String(niveauMax)); } catch (e) { /* pas grave */ }
  }
}
/* ---------- La carte des niveaux : les 5 niveaux sont posés sur un chemin ---------- */
const CHEMIN = [[10, 68], [30, 30], [50, 64], [70, 28], [90, 60]];                  // position de chaque niveau (en % de la carte)
const ICONES_NIVEAU = ['🌲', '🌸', '🏯', '⛓️', '⛪'];
function courbe(i) {                                     // une courbe douce entre le niveau i et le suivant (Catmull-Rom)
  const P = CHEMIN, p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
  return `M ${p1[0]} ${p1[1]} C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
}
function construireChoixNiveaux() {
  const segments = CHEMIN.slice(0, -1).map((_, i) => `<path d="${courbe(i)}" class="chemin-base"/><path d="${courbe(i)}" class="chemin-trait${i < niveauMax ? ' fait' : ''}"/>`).join('');
  const noeuds = NIVEAUX.map((n, i) => {
    const ferme = i > niveauMax, fait = i < niveauMax, courant = i === niveauMax, [x, y] = CHEMIN[i];
    return `<button class="noeud n${i}${ferme ? ' ferme' : ''}${fait ? ' fait' : ''}${courant ? ' courant' : ''}" style="left:${x}%;top:${y}%" data-i="${i}" ${ferme ? 'disabled' : ''} aria-label="Niveau ${i + 1} : ${n.nom}">
      <span class="noeud-num">${ferme ? '🔒' : i + 1}</span>${fait ? '<span class="badge">✔</span>' : ''}${i === NIVEAUX.length - 1 ? '<span class="badge couronne">👑</span>' : ''}
      <span class="noeud-nom"><b>${ICONES_NIVEAU[i]} ${n.nom}</b><em>${n.difficulte}</em></span></button>`;
  }).join('');
  elNivEcran.innerHTML = `<button class="fermer" id="niveaux-fermer" aria-label="Retour" title="Retour">✕</button><h2>Choisis ton niveau</h2>
    <div class="carte-chemin"><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="chemin-svg">${segments}</svg>${noeuds}</div>`;
}
let bilanOuvert = false;                                 // la fenêtre « Bilan d'apprentissage » est ouverte
const elBilan = document.getElementById('bilan');
function ouvrirBilan() {
  const l = Stats.parNiveau(), pct = (a, b) => b ? Math.round(100 * a / b) + ' %' : '–';
  let h;
  if (!l.length) h = '<p>Pas encore de résultats. Joue l\'Entraînement ou un niveau, puis reviens ici !</p>';
  else {
    h = '<p class="bilan-intro">Chaque fois que l\'enfant lance un filtre, on note s\'il a choisi la bonne carte. Ce qui compte : la part de <b>bons choix au premier essai</b>. Elle doit monter avec l\'entraînement.</p>'
      + '<table class="bilan-tab"><tr><th>Partie</th><th>Essais</th><th>Bon choix au 1er essai</th><th>Carte trop petite</th><th>Carte trop grande</th><th>Mauvais filtre</th></tr>'
      + l.map(x => `<tr><td>${x.niveau}</td><td>${x.essais}</td><td><b>${x.parfaits}/${x.premiers}</b> (${pct(x.parfaits, x.premiers)})</td><td>${x.petites}</td><td>${x.grandes}</td><td>${x.filtres}</td></tr>`).join('') + '</table>';
  }
  document.getElementById('bilan-corps').innerHTML = h; bilanOuvert = true; elBilan.classList.add('ouvert');
}
function fermerBilan() { bilanOuvert = false; elBilan.classList.remove('ouvert'); }
let aideOuvert = false;                                  // la fenêtre d'aide (les règles du jeu) est ouverte : le jeu est en pause derrière
const elAide = document.getElementById('aide');
function ouvrirAide() { aideOuvert = true; elAide.classList.add('ouvert'); }
function fermerAide() { aideOuvert = false; elAide.classList.remove('ouvert'); }
let confirmOuvert = false;                               // la boîte « Voulez-vous vraiment quitter ? » est ouverte : le jeu est en pause derrière
const elConfirm = document.getElementById('confirmer');
function demanderQuitter() { confirmOuvert = true; elConfirm.classList.add('ouvert'); document.getElementById('confirmer-non').focus(); }
function fermerConfirm() { confirmOuvert = false; elConfirm.classList.remove('ouvert'); }
function quitterPartie() {                               // « Quitter » : on abandonne la partie et on revient à l'accueil
  jeuEnCours = false; arreterTuto(); cacherExplication(); chargerNiveau(0); ouvrirAccueil();
}
function mettreEnPause() { if (!accueilOuvert && !ecranOuvert && !introOuvert && !aideOuvert) ouvrirAccueil(); }   // « Pause » : le menu s'ouvre avec le bouton Reprendre

elAccueil.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'btn-reprendre') { accueilOuvert = false; majAccueil(); }
  else if (b.id === 'btn-jouer') { if (!introVue) ouvrirIntro(); else demarrer(0); }
  else if (b.id === 'btn-histoire') ouvrirIntro();
  else if (b.id === 'btn-entrainement') demarrer(-1);          // la partie Entraînement : sans risque, pour apprendre à choisir sa carte
  else if (b.id === 'btn-nouvelle') demarrer(0);
  else if (b.id === 'btn-niveaux') { construireChoixNiveaux(); elNivEcran.classList.add('ouvert'); }
  else if (b.id === 'btn-comment') ouvrirAide();
  else if (b.id === 'btn-bilan') ouvrirBilan();         // l'aide explique les règles du jeu
  b.blur();
});
elNivEcran.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'niveaux-fermer') elNivEcran.classList.remove('ouvert');
  else if (b.dataset.i !== undefined && !b.disabled) demarrer(+b.dataset.i);
  b.blur();
});
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (confirmOuvert) { if (e.key === 'Escape') { fermerConfirm(); e.escUtilise = true; } return; }              // boîte ouverte : Échap = Non, les autres touches sont ignorées
  if (aideOuvert) { if (e.key === 'Escape') { fermerAide(); e.escUtilise = true; } return; }
  if (bilanOuvert) { if (e.key === 'Escape') { fermerBilan(); e.escUtilise = true; } return; }                    // aide ouverte : Échap la ferme
  if (e.key === 'Escape' && !e.escUtilise) {             // Échap : menu <-> jeu (sauf si une fenêtre vient de se fermer : e.escUtilise)
    if (accueilOuvert && jeuEnCours) { accueilOuvert = false; majAccueil(); }
    else if (!accueilOuvert && !ecranOuvert && !introOuvert) ouvrirAccueil();
  } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && accueilOuvert && !aideOuvert && !bilanOuvert && !elNivEcran.classList.contains('ouvert')) {   // ↑ ↓ : on parcourt le menu
    const items = [...document.querySelectorAll('.hk-item')].filter(b => !b.hidden), k = items.indexOf(document.activeElement);
    items[(k + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); e.preventDefault();
  } else if (e.key === 'Enter' && accueilOuvert && !elNivEcran.classList.contains('ouvert') && !(document.activeElement && document.activeElement.classList.contains('hk-item'))) (jeuEnCours ? btnReprendre : btnJouer).click();
  else if (e.key.toLowerCase() === 'p') { if (accueilOuvert && jeuEnCours) { accueilOuvert = false; majAccueil(); } else mettreEnPause(); }       // P : pause / reprendre
});

document.addEventListener('click', e => { if (e.target.closest('button') && !e.target.closest('.carte')) Son.jouer('clic'); });   // un petit clic sonore sur les boutons

document.getElementById('btn-pause').addEventListener('click', e => { mettreEnPause(); e.currentTarget.blur(); });
document.getElementById('btn-quitter').addEventListener('click', e => { demanderQuitter(); e.currentTarget.blur(); });     // « Quitter » demande d'abord confirmation
elConfirm.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b && b.id === 'confirmer-oui') { fermerConfirm(); quitterPartie(); }
  else if ((b && b.id === 'confirmer-non') || e.target === elConfirm) fermerConfirm();                                  // Non, ou un clic à côté de la boîte
  if (b) b.blur();
});
document.getElementById('btn-aide').addEventListener('click', e => { if (!accueilOuvert && !introOuvert && !confirmOuvert && !ecranOuvert) ouvrirAide(); e.currentTarget.blur(); });   // le bouton Aide, sous les filtres
document.getElementById('aide-fermer').addEventListener('click', e => { fermerAide(); e.currentTarget.blur(); });

document.querySelectorAll('.hk-item').forEach(b => b.addEventListener('mouseenter', () => b.focus()));          // le menu s'allume sous la souris comme au clavier
document.getElementById('bilan-fermer').addEventListener('click', e => { fermerBilan(); e.currentTarget.blur(); });
document.getElementById('bilan-csv').addEventListener('click', e => {                 // export pour le rapport : un fichier CSV qu'on ouvre dans Excel
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + Stats.csv()], { type: 'text/csv;charset=utf-8' })); a.download = 'bilan-quete-lunettes.csv'; a.click(); e.currentTarget.blur();
});
document.getElementById('bilan-effacer').addEventListener('click', e => { if (confirm('Effacer tous les résultats ?')) { Stats.effacer(); ouvrirBilan(); } e.currentTarget.blur(); });