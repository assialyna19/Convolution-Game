/* =====================================================
   LE DÉFI AVANT LE PIÈGE : un petit calcul qui donne la bonne carte
   Quand le prince arrive devant un piège, le jeu s'arrête et une étiquette s'affiche au milieu de l'écran :
     « ⚠ Un trou arrive ! Petit défi : 2 × 2 + 1 = ? »   avec 3 réponses.
   La bonne réponse, c'est la BONNE CARTE pour ce piège (la plus petite qui marche : tailleMinimale dans pieges.js).
   Les 3 réponses changent de forme d'un piège à l'autre, pour apprendre que c'est la même chose :
     • le nom      : Petite / Moyenne / Suprême
     • la taille   : 3×3 / 5×5 / 7×7
     • les cases   : 9 / 25 / 49            (une carte 5×5 a 5 × 5 = 25 cases)
   Les calculs deviennent plus difficiles à chaque niveau (enfants de 10 à 14 ans) :
     niveau 1 : addition · niveau 2 : soustraction · niveau 3 : multiplication ou division
     niveau 4 : deux opérations (2 × 3 + 1) · niveau 5 : parenthèses ((12 + 13) ÷ 5)
   Clavier : 1, 2, 3 pour répondre ; Entrée pour continuer.
   ===================================================== */
let quizOuvert = false;                                         // le jeu est en pause tant que le défi est affiché (voir update() dans jeu.js)
const quiz = { p: null, bonne: 0, reussi: false };
const TAILLES = [3, 5, 7], NOMS_CARTE = { 3: 'Petite', 5: 'Moyenne', 7: 'Suprême' };
const FORMATS = ['nom', 'taille', 'cases'];

/* La fenêtre du défi (fabriquée ici : pas besoin de toucher à index.html) */
const elQuiz = document.createElement('div');
elQuiz.id = 'quiz'; elQuiz.setAttribute('role', 'dialog'); elQuiz.setAttribute('aria-modal', 'true'); elQuiz.setAttribute('aria-labelledby', 'quiz-titre');
elQuiz.innerHTML = `<div class="quiz-carte">
  <p class="quiz-alerte" id="quiz-titre"></p>
  <p class="quiz-consigne" id="quiz-consigne"></p>
  <p class="quiz-calcul" id="quiz-calcul"></p>
  <div class="quiz-reponses" id="quiz-reponses"></div>
  <p class="quiz-message" id="quiz-message" role="status"></p>
  <p class="quiz-aide">Petite = <b>3×3</b> = 9 cases · Moyenne = <b>5×5</b> = 25 cases · Suprême = <b>7×7</b> = 49 cases</p>
  <button class="btn-petit vert quiz-go" id="quiz-go" hidden>C'est parti ! ▶</button>
</div>`;
document.getElementById('cadre').appendChild(elQuiz);
const elQTitre = document.getElementById('quiz-titre'), elQConsigne = document.getElementById('quiz-consigne'), elQCalcul = document.getElementById('quiz-calcul');
const elQRep = document.getElementById('quiz-reponses'), elQMsg = document.getElementById('quiz-message'), elQGo = document.getElementById('quiz-go');

/* ---------- Les calculs : un résultat R donné, une opération simple qui tombe juste ---------- */
const hasardEntre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const auHasard = l => l[Math.floor(Math.random() * l.length)];
function calculPour(R, niveau) {                                // renvoie un texte comme « 4 + 5 », dont le résultat est R
  const L = Math.max(0, niveau);
  if (L === 0) { const a = hasardEntre(1, R - 1); return `${a} + ${R - a}`; }                                   // addition
  if (L === 1) { const b = hasardEntre(2, R > 9 ? 30 : 9); return `${R + b} − ${b}`; }                          // soustraction
  if (L === 2) {                                                                                                // multiplication ou division
    if ([9, 25, 49].includes(R) && Math.random() < 0.6) { const s = Math.sqrt(R); return `${s} × ${s}`; }
    const d = hasardEntre(2, 6); return `${R * d} ÷ ${d}`;
  }
  if (L === 3) {                                                                                                // deux opérations : a × b + c ou a × b − c
    const l = [];
    for (let a = 2; a <= 9; a++) for (let b = a; b <= 9; b++) {
      const c = R - a * b; if (c >= 1 && c <= 9) l.push(`${a} × ${b} + ${c}`);
      const d = a * b - R; if (d >= 1 && d <= 9) l.push(`${a} × ${b} − ${d}`);
    }
    return auHasard(l);
  }
  const l = [];                                                                                                 // parenthèses : (a + b) ÷ c, ou (a − b) × c
  for (let c = 2; c <= 5; c++) { const t = R * c; for (let a = Math.max(2, t - 60); a <= Math.min(60, t - 2); a++) l.push(`(${a} + ${t - a}) ÷ ${c}`); }
  for (let c = 1; c <= 7; c++) if (R % c === 0) { const t = R / c; for (let b = 2; b <= 9; b++) l.push(`(${t + b} − ${b}) × ${c}`); }
  return auHasard(l);
}
function etiquette(n, format) { return format === 'nom' ? NOMS_CARTE[n] : format === 'taille' ? `${n}×${n}` : `${n * n}`; }

/* ---------- Ouvrir le défi devant un piège ---------- */
function ouvrirQuiz(p) {
  const i = pieges.indexOf(p), format = FORMATS[(i + Math.max(0, niveauIdx)) % 3], n = tailleMinimale(p);
  const R = format === 'cases' ? n * n : n, calc = calculPour(R, niveauIdx);
  Object.assign(quiz, { p, bonne: TAILLES.indexOf(n), reussi: false, n, R, format });
  p.quizFait = true; quizOuvert = true;
  elQTitre.innerHTML = `⚠ ${p.nom} droit devant !`;
  elQConsigne.innerHTML = format === 'cases' ? 'Petit défi : le résultat te dit <b>combien de cases</b> a ta carte.' : 'Petit défi : le résultat te dit <b>quelle carte</b> prendre.';
  elQCalcul.textContent = `${calc} = ?`;
  elQRep.innerHTML = TAILLES.map((t, j) => `<button type="button" data-j="${j}"><span>${etiquette(t, format)}</span>${format === 'cases' ? '<small>cases</small>' : ''}<kbd>${j + 1}</kbd></button>`).join('');
  elQMsg.textContent = ''; elQMsg.className = 'quiz-message'; elQGo.hidden = true;
  elQuiz.classList.add('ouvert'); Son.jouer('carte');
  setTimeout(() => { const b = elQRep.querySelector('button'); if (b) b.focus(); }, 50);
}
function fermerQuiz() {
  quizOuvert = false; elQuiz.classList.remove('ouvert'); quiz.p = null;
  const b = document.activeElement; if (b && b.blur) b.blur();
}
function repondreQuiz(j) {
  if (!quizOuvert || quiz.reussi) return;
  const b = elQRep.children[j]; if (!b || b.disabled) return;
  if (j === quiz.bonne) {
    quiz.reussi = true; b.classList.add('bon'); [...elQRep.children].forEach(x => x.disabled = true);
    const n = quiz.n, nom = NOMS_CARTE[n].toLowerCase();
    elQMsg.className = 'quiz-message bon';
    elQMsg.innerHTML = `🎉 Bien joué ! ${quiz.R}${quiz.format === 'cases' ? ' cases' : ''} → la carte <b>${nom} ${n}×${n}</b>.<br>Maintenant tu sais quelle carte choisir !`;
    elQGo.hidden = false; elQGo.focus(); Son.jouer('piece');
    const carte = document.querySelector(`#fenetres .fen-btn[data-n="${n}"]`);                 // la carte à prendre brille un moment dans la colonne de gauche
    if (carte) { carte.classList.add('quiz-indice'); setTimeout(() => carte.classList.remove('quiz-indice'), 7000); }
  } else {
    b.classList.add('faux'); b.disabled = true;
    elQMsg.className = 'quiz-message faux'; elQMsg.textContent = '🤔 Pas tout à fait… Recompte bien et réessaie !';
    Son.jouer('echec');
  }
}
elQRep.addEventListener('click', e => { const b = e.target.closest('button'); if (b) repondreQuiz(+b.dataset.j); });
elQGo.addEventListener('click', fermerQuiz);
addEventListener('keydown', e => {                              // quiz.js est chargé avant jeu.js : pendant le défi, les touches 1 2 3 ne changent pas de filtre
  if (!quizOuvert || accueilOuvert || aideOuvert || confirmOuvert) return;
  const j = '123'.indexOf(e.key);
  if (j >= 0 && e.key.length === 1) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) repondreQuiz(j); return; }
  if ((e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e') && quiz.reussi) { e.preventDefault(); e.stopImmediatePropagation(); fermerQuiz(); return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'e', 'E'].includes(e.key)) { e.stopImmediatePropagation(); }   // le prince ne bouge pas pendant le défi
});

/* ---------- Le prince arrive devant un piège ? ---------- */
function surveillerQuiz() {
  if (quizOuvert && (!quiz.p || !pieges.includes(quiz.p))) fermerQuiz();                        // on a changé de niveau pendant le défi
  const libre = jeuEnCours && !accueilOuvert && !introOuvert && !ecranOuvert && !aideOuvert && !confirmOuvert && !(typeof bilanOuvert !== 'undefined' && bilanOuvert);
  if (!quizOuvert && libre && !heros.auto && !pieges.some(p => p.etat === 'anim')) {
    const p = pieges.find(q => q.etat === 'actif' && !q.quizFait && heros.x > q.zx - 430 && heros.x < q.zx + 10);
    if (p) ouvrirQuiz(p);
  }
  requestAnimationFrame(surveillerQuiz);
}
requestAnimationFrame(surveillerQuiz);
