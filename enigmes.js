/* =====================================================
   LES ÉNIGMES : avant de lancer un filtre (touche E, hors entraînement), il faut réussir l'énigme du piège.
   Les bonnes réponses ne sont PAS écrites en dur : elles viennent du moteur (taillesQuiMarchent, tailleMinimale, reussiAvec, filtrer).
   Une mauvaise réponse ne coûte rien : indice, puis deuxième indice, puis on réessaie. « Pourquoi ? » montre la vérification sur la vraie grille.
   ===================================================== */
const COMPAT = { trou: ['fermeture', 'dilatation'], buisson: ['ouverture', 'erosion'] };      // filtres acceptés par type de piège (le vrai résultat décide)
const OP_DE = { trou: 'fermeture', buisson: 'ouverture', sable: 'flou', tornade: 'gaussien', mur: 'contours', brouillard: 'nettete' };
const QUESTION_OP = { trou: "Oh non, un trou ! Quelle opération le bouche ?", buisson: "Le buisson a de fines tiges sous une grande voûte. Quelle opération coupe les petites parties fines et garde la forme principale ?", sable: "Du sable mouvant : des grains au hasard. Quel filtre mélange les voisins ?", tornade: "Une tornade agite des débris. Quel filtre calme ce qui s'agite ?", mur: "Un mur lisse cache une porte secrète. Quel filtre ne garde que les bords ?", brouillard: "Des détails se cachent dans le brouillard. Quel filtre les fait ressortir ?" };
let enigmeOuverte = false;

function buildEnigmes(p, niv) {
  const T = p.type, bons = taillesQuiMarchent(p), nMin = tailleMinimale(p), morph = T === 'trou' || T === 'buisson';
  const ops = morph ? ['erosion', 'dilatation', 'ouverture', 'fermeture'] : ['flou', 'gaussien', 'nettete', 'contours'];
  const qOp = { t: QUESTION_OP[T], o: ops.map(k => [FILTRES_JEU[k].icone + ' ' + FILTRES_JEU[k].nom, k]), bon: v => v === OP_DE[T],
    ind: ["Relis le problème : que doit faire le filtre ? Mélanger, couper, boucher, calmer, révéler ?", "Ce n'est pas la bonne famille. Pense au verbe : " + FILTRES_JEU[OP_DE[T]].court.toLowerCase() + "."],
    ex: () => FILTRES_JEU[OP_DE[T]].info + (T === 'trou' ? ' Fermeture = dilatation puis érosion.' : T === 'buisson' ? ' Ouverture = érosion puis dilatation.' : '') };
  const quoi = T === 'trou' ? `Le trou fait ${p.large} cases de large. La carte doit être impaire et plus grande que lui. Quelle est la plus petite taille ?` : T === 'buisson' ? `Tiges de ${p.tige || 1} case(s), voûte de ${p.epais} : quelle carte coupe les tiges ?` : "Quelle taille de carte réussit ce piège ?";
  const sz = { t: quoi, o: [3, 5, 7].map(n => [n + '×' + n, n]), bon: n => T === 'trou' ? n === nMin : bons.includes(n),
    ind: [T === 'trou' ? `Compte les cases du trou : ${p.large}. La carte doit dépasser ce nombre.` : "Compare la taille de l'obstacle (en cases) à celle de la carte.", `Il y a ${bons.length} taille(s) qui marchent ; la plus petite est ${nMin}×${nMin}.`],
    ex: v => `${v}×${v} : ${reussiAvec(p, filtrer(p, v)) ? 'réussit' : 'échoue'} sur la vraie grille.` + (bons.includes(v) && v !== nMin ? ` Mais ${nMin}×${nMin} suffit et coûte moins cher.` : '') };
  const k2 = nMin * nMin, calc = { t: `Une carte ${nMin}×${nMin} regarde combien de cases à la fois ?`, o: [...new Set([k2 - nMin, 2 * nMin, k2])].sort((a, b) => a - b).map(v => [String(v), v]), bon: v => v === k2,
    ind: [`Une carte ${nMin}×${nMin} : ${nMin} lignes de ${nMin} cases.`, `Multiplie ${nMin} × ${nMin}.`], ex: () => `${nMin}×${nMin} = ${k2} cases. Pour une érosion, la somme doit valoir ${k2} pour garder la case.` };
  return niv <= 0 ? [sz] : niv <= 2 ? [qOp, sz] : [qOp, calc, sz];
}
function ouvrirEnigme(p) {
  if (enigmeOuverte) return;
  const Q = buildEnigmes(p, niveauIdx); let qi = 0, err = 0, fini = false; enigmeOuverte = true; aideOuvert = true;      // aideOuvert = true : le jeu est en pause derrière
  const el = document.createElement('div'); el.id = 'enigme'; document.getElementById('cadre').appendChild(el);
  const fermer = () => { el.remove(); enigmeOuverte = false; aideOuvert = false; };
  const verif = () => [3, 5, 7].map(n => `${n}×${n} ${reussiAvec(p, filtrer(p, n)) ? '✅' : '❌'}`).join('  ·  ');
  function afficher(msg = '', ok = false, ver = false) {
    const q = Q[qi];
    el.innerHTML = `<div class="e-carte"><p>🧩 Énigme ${qi + 1}/${Q.length}</p><p>${q.t}</p><div class="e-opts">${q.o.map(([l, v]) => `<button class="btn-petit" data-v="${v}" ${ok ? 'disabled' : ''}>${l}</button>`).join('')}</div><p>${msg}</p>${ver ? `<p>Vérification sur la vraie grille : ${verif()}</p>` : ''}<div class="e-opts">${ok || err >= 2 ? '<button class="btn-petit" id="e-pq">Pourquoi ?</button>' : ''}${ok ? '<button class="btn-petit vert" id="e-ok">Continuer ▶</button>' : ''}</div></div>`;
    el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      const v = +b.dataset.v; Son.jouer('carte');
      if (q.bon(v)) { err = 0; afficher('✅ Bravo ! ' + q.ex(v), true); }
      else { err++; afficher(`Pas tout à fait, essaie encore ! 💡 ${q.ind[Math.min(err, 2) - 1]}`); }
    });
    const pq = el.querySelector('#e-pq'); if (pq) pq.onclick = () => afficher(msg, ok, true);
    const go = el.querySelector('#e-ok'); if (go) go.onclick = () => { if (++qi < Q.length) { err = 0; afficher(); } else { p.enigmeOk = true; fermer(); montrerBulle("Bien joué ! Choisis ta carte et ton filtre, puis appuie sur E."); } };
  }
  afficher();
}
addEventListener('keydown', e => { if (!e.repeat && (e.key === '8' || e.key === '9') && !enigmeOuverte) choisirOutil(e.key === '8' ? 'erosion' : 'dilatation'); });
setInterval(() => {                                      // l'énigme apparaît quand le héros découvre le piège
  if (enigmeOuverte || !jeuEnCours || accueilOuvert || introOuvert || aideOuvert || ecranOuvert || niveauActuel.entrainement) return;
  const p = pieges.find(q => q.etat === 'actif' && !q.enigmeOk && heros.x > q.zx - 380 && heros.x < q.zx + q.zl);
  if (p) ouvrirEnigme(p);
}, 250);
const stE = document.createElement('style'); stE.textContent = "#enigme{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(10,6,24,.82)}#enigme .e-carte{background:#1b1233;border:3px solid #ffd166;border-radius:16px;padding:14px 18px;max-width:min(560px,94%);color:#fff;font:600 16px 'Baloo 2',system-ui,sans-serif;text-align:center}#enigme .e-opts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:10px 0}#enigme p{margin:6px 0}"; document.head.appendChild(stE);
