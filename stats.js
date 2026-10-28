/* =====================================================
   LE BILAN D'APPRENTISSAGE : mesurer si l'enfant a compris
   À chaque fois que le joueur lance un filtre, on note : le niveau, le piège, le filtre choisi, la taille de carte choisie,
   la plus petite carte qui aurait suffi, et le résultat. Tout reste dans le navigateur (localStorage), rien n'est envoyé.
   Ce qu'on mesure surtout : la part de bons choix AU PREMIER ESSAI (c'est elle qui doit augmenter avec l'entraînement).
   Causes possibles : ok_parfait (bonne carte) | ok_trop_grande (ça passe, mais une carte plus petite suffisait) | ok_sable
                      | trop_petite (la carte ne suffit pas) | mauvais_filtre
   ===================================================== */
const Stats = (() => {
  const CLE = 'quete-stats';
  let journal = [], partie = [];                        // journal = tout ce qui est gardé ; partie = ce qui s'est passé depuis le début du niveau
  try { journal = JSON.parse(localStorage.getItem(CLE) || '[]'); } catch (e) { journal = []; }
  const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(journal.slice(-2000))); } catch (e) { /* tant pis */ } };
  const parfait = e => e.ok && (e.cause === 'ok_parfait' || e.cause === 'ok_sable');
  function nouveauNiveau() { partie = []; }
  function noter(e) {
    e.premier = !partie.some(x => x.piege === e.piege);   // premier essai sur ce piège, dans cette partie ?
    e.t = Date.now(); partie.push(e); journal.push(e); sauver(); return e;
  }
  function resumePartie() {
    const premiers = partie.filter(e => e.premier);
    return { total: premiers.length, parfaits: premiers.filter(parfait).length, reussis: premiers.filter(e => e.ok).length, erreurs: partie.filter(e => !e.ok).length };
  }
  function conseil() {                                  // un conseil adapté à la dernière erreur
    const e = [...partie].reverse().find(x => !x.ok);
    if (!e) return 'Prends ton temps : regarde bien la taille de l\'obstacle avant de choisir ta carte !';
    if (e.cause === 'mauvais_filtre') return 'Chaque piège a son filtre : la Brume pour le sable, le Mortier pour un trou, la Faucille pour un buisson.';
    if (e.cause === 'echec_trop_grande') return 'Une carte plus grande n\'est pas toujours meilleure : elle peut effacer ou étaler ce qu\'il faut garder.';
    return e.type === 'trou' ? 'Pour boucher un trou, ta carte doit être plus grande que lui : compte ses cases !' : 'Pour couper des tiges, ta carte doit être plus grande que les tiges, mais pas plus grande que la voûte.';
  }
  function parNiveau() {                                // un tableau par niveau, pour la fenêtre « Bilan »
    const noms = { '-1': 'Entraînement' }, lignes = [];
    [...new Set(journal.map(e => e.niv))].sort((a, b) => a - b).forEach(n => {
      const l = journal.filter(e => e.niv === n), p = l.filter(e => e.premier);
      lignes.push({ niveau: noms[n] || 'Niveau ' + (n + 1), essais: l.length, premiers: p.length, parfaits: p.filter(parfait).length,
        petites: l.filter(e => e.cause === 'trop_petite').length, grandes: l.filter(e => e.cause === 'ok_trop_grande' || e.cause === 'echec_trop_grande').length, filtres: l.filter(e => e.cause === 'mauvais_filtre').length });
    });
    return lignes;
  }
  function csv() {
    const tete = 'date;niveau;piege;type;filtre_choisi;filtre_attendu;carte_choisie;carte_minimale;reussi;premier_essai;cause';
    return [tete, ...journal.map(e => [new Date(e.t).toISOString(), e.niv, e.piege, e.type, e.filtre, e.attendu, e.carte, e.minimale, e.ok ? 1 : 0, e.premier ? 1 : 0, e.cause].join(';'))].join('\n');
  }
  function effacer() { journal = []; partie = []; sauver(); }
  return { nouveauNiveau, noter, resumePartie, conseil, parNiveau, csv, effacer, nbEssais: () => journal.length };
})();