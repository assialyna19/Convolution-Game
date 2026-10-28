/* =====================================================
   LE SON ET LA MUSIQUE : tout est fabriqué par le code (Web Audio), il n'y a aucun fichier audio.
   - une musique d'ambiance différente pour chaque niveau (accords lents, notes de cloche, basse, effets)
   - des bruitages : saut, cartes, lunettes, filtre qui glisse, réussite, échec, dégâts, chute, vapeur, guérison, fin de niveau
   - bouton 🔊 en haut à droite (ou touche M) pour couper le son ; le choix est gardé dans le navigateur
   Les navigateurs interdisent le son tant que le joueur n'a pas cliqué ou appuyé sur une touche : le son démarre au premier geste.
   ===================================================== */
const Son = (() => {
  let ctx = null, master, musique, effets, envoiReverb, bruitBuf, minuteur, theme = null, mesure = 0, prochaine = 0, actif = true;
  try { actif = localStorage.getItem('quete-son') !== '0'; } catch (e) { /* tant pis */ }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);                                // numéro de note MIDI -> fréquence en Hz

  // Une ambiance par niveau : racine = note de base, echelle = notes de l'arpège, accords = suite d'accords (en demi-tons)
  const THEMES = {
    lucioles: { bpm: 58, racine: 45, echelle: [0, 3, 5, 7, 10, 12, 15], accords: [[0, 7, 12, 15], [-4, 3, 8, 12], [3, 10, 15, 19], [-2, 5, 10, 14]], pad: { type: 'sawtooth', vol: 0.028, filtre: 520 }, arp: { p: 0.45, type: 'triangle', vol: 0.07 } },
    cathedrale: { bpm: 54, racine: 38, echelle: [0, 2, 3, 7, 8, 12, 14], accords: [[0, 7, 12, 15], [-2, 5, 10, 14], [-4, 3, 8, 12], [-5, 2, 7, 10]], pad: { type: 'square', vol: 0.02, filtre: 760 }, arp: { p: 0.35, type: 'sine', vol: 0.08 } },
    violette:  { bpm: 60, racine: 40, echelle: [0, 1, 4, 7, 8, 12, 13, 16], accords: [[0, 7, 12, 16], [1, 8, 13, 17], [-4, 3, 8, 11], [0, 7, 12, 15]], pad: { type: 'triangle', vol: 0.05, filtre: 900 }, arp: { p: 0.7, type: 'sine', vol: 0.07 } },
    marais:    { bpm: 48, racine: 36, echelle: [0, 1, 3, 6, 7, 10, 12], accords: [[0, 7, 12], [1, 8, 13], [0, 6, 12], [-2, 5, 10]], pad: { type: 'sawtooth', vol: 0.03, filtre: 380 }, arp: { p: 0.2, type: 'sine', vol: 0.06 }, gouttes: true },
    donjon:    { bpm: 72, racine: 38, echelle: [0, 3, 5, 7, 10, 12], accords: [[0, 7, 12, 15], [-2, 5, 10, 14], [0, 7, 12, 15], [3, 10, 15, 19]], pad: { type: 'sawtooth', vol: 0.034, filtre: 620 }, arp: { p: 0.4, type: 'triangle', vol: 0.07 }, pouls: true }
  };

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (ctx || !AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = actif ? 0.9 : 0; master.connect(ctx.destination);
    musique = ctx.createGain(); musique.gain.value = 0.4; musique.connect(master);
    effets = ctx.createGain(); effets.gain.value = 0.75; effets.connect(master);
    const rev = ctx.createConvolver(), n = Math.floor(ctx.sampleRate * 2.4), imp = ctx.createBuffer(2, n, ctx.sampleRate);   // une réverbération : du bruit qui s'éteint
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    rev.buffer = imp; envoiReverb = ctx.createGain(); envoiReverb.gain.value = 0.55; envoiReverb.connect(rev); rev.connect(master);
    bruitBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const b = bruitBuf.getChannelData(0); for (let i = 0; i < b.length; i++) b[i] = Math.random() * 2 - 1;
    prochaine = ctx.currentTime + 0.2; minuteur = setInterval(planifier, 150);
  }
  function note(f, t0, dur, type, vol, o = {}) {                // une note : oscillateur -> enveloppe -> [filtre] -> sortie (+ réverbération)
    const osc = ctx.createOscillator(), g = ctx.createGain(), att = o.att ?? 0.01, rel = o.rel ?? 0.3;
    osc.type = type; osc.frequency.setValueAtTime(f, t0); if (o.detune) osc.detune.value = o.detune;
    if (o.glisse) osc.frequency.exponentialRampToValueAtTime(o.glisse, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + att); g.gain.setValueAtTime(vol, Math.max(t0 + att, t0 + dur - rel)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    if (o.filtre) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.filtre; osc.connect(fl); fl.connect(g); } else osc.connect(g);
    g.connect(o.dest || effets);
    if (o.rev) { const s = ctx.createGain(); s.gain.value = o.rev; g.connect(s); s.connect(envoiReverb); }
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function souffle(t0, dur, vol, f0, f1) {                      // un souffle (vapeur, dégâts) : du bruit filtré dont la fréquence glisse
    const s = ctx.createBufferSource(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    s.buffer = bruitBuf; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 1.2;
    fl.frequency.setValueAtTime(f0, t0); fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(effets); s.start(t0); s.stop(t0 + dur + 0.05);
  }

  function jouerMesure(T, t0, barre) {                           // une mesure de musique : nappe, basse, arpège, effets propres au thème
    const accord = T.accords[mesure % T.accords.length], beat = 60 / T.bpm;
    accord.forEach(o => [-6, 6].forEach(dt => note(mtof(T.racine + o), t0, barre + 1.4, T.pad.type, T.pad.vol, { att: 1.4, rel: 1.6, filtre: T.pad.filtre, detune: dt, dest: musique, rev: 0.5 })));
    note(mtof(T.racine + accord[0] - 12), t0, barre * 0.6, 'sine', 0.2, { att: 0.05, rel: 0.6, dest: musique });
    for (let i = 0; i < 8; i++) if (Math.random() < T.arp.p) {
      const m = T.racine + 24 + T.echelle[Math.floor(Math.random() * T.echelle.length)];
      note(mtof(m), t0 + i * barre / 8, 1.2, T.arp.type, T.arp.vol, { att: 0.005, rel: 1, dest: musique, rev: 0.9 });
    }
    if (T.pouls) [0, 1.5].forEach(b => note(58, t0 + b * beat, 0.3, 'sine', 0.3, { glisse: 32, att: 0.005, rel: 0.2, dest: musique }));    // battement de cœur
    if (T.gouttes) for (let i = 0; i < 2; i++) note(1500 + Math.random() * 900, t0 + Math.random() * barre, 0.3, 'sine', 0.07, { glisse: 800, rev: 1, dest: musique });   // gouttes d'eau
  }
  function planifier() {                                         // on prépare la musique un peu à l'avance
    if (!ctx || !theme) return;
    const T = THEMES[theme], barre = 4 * 60 / T.bpm;
    if (prochaine < ctx.currentTime) prochaine = ctx.currentTime + 0.1;
    while (prochaine < ctx.currentTime + 1.0) { jouerMesure(T, prochaine, barre); prochaine += barre; mesure++; }
  }

  function jouer(nom) {                                          // les bruitages
    if (!ctx || !actif) return;
    const t = ctx.currentTime;
    switch (nom) {
      case 'clic': note(900, t, 0.06, 'triangle', 0.16); break;
      case 'carte': note(520, t, 0.07, 'triangle', 0.18); note(780, t + 0.05, 0.09, 'triangle', 0.16); break;
      case 'lunettes': note(600, t, 0.5, 'sine', 0.15, { glisse: 1500, rel: 0.4, rev: 0.6 }); note(900, t + 0.08, 0.5, 'sine', 0.09, { glisse: 2000, rev: 0.6 }); break;
      case 'saut': note(260, t, 0.16, 'square', 0.08, { glisse: 560, att: 0.005, rel: 0.1, filtre: 1800 }); break;
      case 'tick': note(500 + Math.random() * 400, t, 0.05, 'sine', 0.05); break;
      case 'succes': [523, 659, 784, 1047].forEach((f, i) => note(f, t + i * 0.09, 0.4, 'triangle', 0.18, { rev: 0.5 })); break;
      case 'echec': note(180, t, 0.4, 'sawtooth', 0.1, { glisse: 90, filtre: 700 }); break;
      case 'degat': souffle(t, 0.25, 0.4, 1800, 200); note(140, t, 0.3, 'square', 0.12, { glisse: 60, filtre: 600 }); break;
      case 'chute': note(700, t, 0.7, 'sine', 0.18, { glisse: 80, rel: 0.5 }); break;
      case 'vapeur': souffle(t, 0.4, 0.5, 3000, 600); break;
      case 'bloc': souffle(t, 0.18, 0.3, 800, 300); note(200, t, 0.15, 'square', 0.07, { filtre: 500 }); break;
      case 'contamine': note(110, t, 0.5, 'sawtooth', 0.12, { glisse: 70, filtre: 500 }); note(117, t, 0.5, 'sawtooth', 0.1, { filtre: 500 }); break;
      case 'guerison': [659, 784, 988, 1319, 1568].forEach((f, i) => note(f, t + i * 0.08, 0.7, 'sine', 0.15, { rev: 0.9, rel: 0.5 })); break;
      case 'piece': note(1320, t, 0.07, 'triangle', 0.1); note(1760, t + 0.06, 0.18, 'triangle', 0.1, { rev: 0.3 }); break;
      case 'coffre': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => note(f, t + i * 0.06, 0.5, 'triangle', 0.14, { rev: 0.6 })); break;
      case 'perdu': [392, 349, 311, 262].forEach((f, i) => note(f, t + i * 0.28, 0.7, 'sine', 0.16, { rev: 0.8, rel: 0.5 })); break;
      case 'fin': [392, 523, 659, 784, 1047].forEach((f, i) => note(f, t + i * 0.14, 0.9, 'triangle', 0.18, { rev: 0.8, rel: 0.7 })); break;
    }
  }
  function changerTheme(nom) { if (nom === theme) return; theme = nom; mesure = 0; if (ctx) prochaine = ctx.currentTime + 0.3; }
  function debloquer() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function majBouton() { const b = document.getElementById('btn-son'); if (b) { b.classList.toggle('muet', !actif); b.title = actif ? 'Couper le son (touche M)' : 'Remettre le son (touche M)'; } }   // l'icône change par le style (barre sur le haut-parleur)
  function basculer() {
    actif = !actif; try { localStorage.setItem('quete-son', actif ? '1' : '0'); } catch (e) { /* tant pis */ }
    debloquer(); if (master) master.gain.setTargetAtTime(actif ? 0.9 : 0, ctx.currentTime, 0.05); majBouton();
  }
  return { musique: changerTheme, jouer, debloquer, basculer, majBouton, _planifier: planifier, _init: init };
})();

['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => Son.debloquer(), { passive: true }));   // le son démarre au premier geste du joueur
document.getElementById('btn-son').addEventListener('click', e => { Son.basculer(); e.currentTarget.blur(); });
addEventListener('keydown', e => { if (!e.repeat && e.key.toLowerCase() === 'm') Son.basculer(); });
Son.majBouton();